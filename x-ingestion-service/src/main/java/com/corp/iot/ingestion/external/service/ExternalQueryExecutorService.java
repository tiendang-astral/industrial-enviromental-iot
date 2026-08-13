package com.corp.iot.ingestion.external.service;

import com.corp.iot.ingestion.external.crypto.CredentialDecryptionService;
import com.corp.iot.ingestion.external.dto.ExternalReadingEvent;
import com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig;
import com.corp.iot.ingestion.external.dto.ExternalSourceCredential;
import com.corp.iot.ingestion.external.dto.ExternalSourceFilter;
import com.corp.iot.ingestion.external.dto.ExternalSourceQueryConfig;
import com.corp.iot.ingestion.external.entity.ExternalSource;
import com.corp.iot.ingestion.external.entity.ExternalSourceJob;
import com.corp.iot.ingestion.external.producer.ExternalDataRawProducer;
import com.corp.iot.ingestion.external.producer.ExternalMessageIdGenerator;
import com.corp.iot.ingestion.external.util.SqlIdentifierValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

// Kết nối PostgreSQL ngoài bằng JDBC thuần (không qua Hibernate — schema DB ngoài không biết
// trước), build query parameterized từ query_config/filter_config, unbundle mỗi field/row
// thành 1 Kafka message (xem ARCHITECTURE.md § Flow: External source data). table/column
// không parameterize được trong JDBC nên phải validate allowlist trước khi ghép chuỗi SQL.
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalQueryExecutorService {

    private static final Set<String> ALLOWED_OPERATORS = Set.of("=", "!=", ">", "<", ">=", "<=");

    private final CredentialDecryptionService credentialDecryptionService;
    private final SqlIdentifierValidator sqlIdentifierValidator;
    private final ExternalMessageIdGenerator messageIdGenerator;
    private final ExternalDataRawProducer externalDataRawProducer;
    private final ObjectMapper objectMapper;

    @Value("${app.external.query-timeout-seconds}")
    private int queryTimeoutSeconds;

    @Value("${app.external.max-rows-per-run}")
    private int maxRowsPerRun;

    public ExecutionResult execute(ExternalSourceJob job, ExternalSource source) {
        ExternalSourceQueryConfig queryConfig = job.getQueryConfig();
        List<ExternalSourceFilter> filters = job.getFilterConfig() == null ? List.of() : job.getFilterConfig();
        if (!validIdentifiers(queryConfig, filters)) {
            return ExecutionResult.failed("Invalid identifier in query_config/filter_config");
        }

        ExternalSourceCredential credential;
        try {
            String decrypted = credentialDecryptionService.decrypt(source.getCredentialEncrypted());
            credential = objectMapper.readValue(decrypted, ExternalSourceCredential.class);
        } catch (Exception e) {
            return ExecutionResult.failed("Failed to decrypt credential: " + e.getMessage());
        }

        String sql = buildSql(queryConfig, filters, job.getIncrementalCursor());
        String jdbcUrl = buildJdbcUrl(source.getConnectionConfig());
        String correlationId = UUID.randomUUID().toString();

        try (Connection connection = DriverManager.getConnection(jdbcUrl, credential.username(), credential.password());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setQueryTimeout(queryTimeoutSeconds);
            statement.setMaxRows(maxRowsPerRun);
            bindParameters(statement, filters, job.getIncrementalCursor());

            int rowCount = 0;
            Instant maxMeasuredAt = null;
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    rowCount++;
                    Instant measuredAt = toInstant(rs.getObject(queryConfig.timestampColumn()));
                    if (measuredAt == null) {
                        continue;
                    }
                    if (maxMeasuredAt == null || measuredAt.isAfter(maxMeasuredAt)) {
                        maxMeasuredAt = measuredAt;
                    }
                    publishRow(job, source, queryConfig, rs, measuredAt, correlationId);
                }
            }
            return ExecutionResult.success(rowCount, maxMeasuredAt);
        } catch (Exception e) {
            log.error("External query failed jobId={}", job.getId(), e);
            return ExecutionResult.failed(truncate(e.getMessage()));
        }
    }

    private void publishRow(ExternalSourceJob job, ExternalSource source, ExternalSourceQueryConfig queryConfig,
                             ResultSet rs, Instant measuredAt, String correlationId) throws java.sql.SQLException {
        for (String column : queryConfig.valueColumns()) {
            Double value = toDouble(rs.getObject(column));
            if (value == null) {
                continue;
            }
            String messageId = messageIdGenerator.generate(job.getId(), column, measuredAt);
            ExternalReadingEvent event = new ExternalReadingEvent(
                    messageId, job.getTenantId(), source.getTenantNodeId(), job.getId(), column, value, measuredAt);
            externalDataRawProducer.send(event, correlationId);
        }
    }

    private boolean validIdentifiers(ExternalSourceQueryConfig config, List<ExternalSourceFilter> filters) {
        if (!sqlIdentifierValidator.isValid(config.table()) || !sqlIdentifierValidator.isValid(config.timestampColumn())) {
            return false;
        }
        if (config.valueColumns().stream().anyMatch(c -> !sqlIdentifierValidator.isValid(c))) {
            return false;
        }
        return filters.stream().allMatch(f -> sqlIdentifierValidator.isValid(f.column()) && ALLOWED_OPERATORS.contains(f.operator()));
    }

    private String buildSql(ExternalSourceQueryConfig config, List<ExternalSourceFilter> filters, String cursor) {
        StringBuilder sql = new StringBuilder("SELECT ").append(config.timestampColumn());
        config.valueColumns().forEach(column -> sql.append(", ").append(column));
        sql.append(" FROM ").append(config.table());

        List<String> conditions = new ArrayList<>();
        if (cursor != null) {
            conditions.add(config.timestampColumn() + " > ?");
        }
        filters.forEach(f -> conditions.add(f.column() + " " + f.operator() + " ?"));
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        sql.append(" ORDER BY ").append(config.timestampColumn()).append(" ASC");
        return sql.toString();
    }

    private void bindParameters(PreparedStatement statement, List<ExternalSourceFilter> filters, String cursor) throws java.sql.SQLException {
        int paramIndex = 1;
        if (cursor != null) {
            statement.setTimestamp(paramIndex++, Timestamp.from(Instant.parse(cursor)));
        }
        for (ExternalSourceFilter filter : filters) {
            statement.setString(paramIndex++, filter.value());
        }
    }

    private String buildJdbcUrl(ExternalSourceConnectionConfig config) {
        String sslMode = config.sslMode() != null ? config.sslMode() : "disable";
        return "jdbc:postgresql://%s:%d/%s?sslmode=%s".formatted(config.host(), config.port(), config.database(), sslMode);
    }

    private Instant toInstant(Object value) {
        if (value instanceof Timestamp ts) {
            return ts.toInstant();
        }
        if (value instanceof OffsetDateTime odt) {
            return odt.toInstant();
        }
        if (value instanceof Instant instant) {
            return instant;
        }
        return null;
    }

    private Double toDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String truncate(String message) {
        if (message == null) {
            return "Unknown error";
        }
        return message.length() > 500 ? message.substring(0, 500) : message;
    }

    public record ExecutionResult(boolean success, int rowCount, Instant maxMeasuredAt, String error) {
        public static ExecutionResult success(int rowCount, Instant maxMeasuredAt) {
            return new ExecutionResult(true, rowCount, maxMeasuredAt, null);
        }

        public static ExecutionResult failed(String error) {
            return new ExecutionResult(false, 0, null, error);
        }
    }
}
