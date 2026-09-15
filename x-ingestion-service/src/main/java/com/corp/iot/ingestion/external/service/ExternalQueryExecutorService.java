package com.corp.iot.ingestion.external.service;

import com.corp.iot.ingestion.external.crypto.CredentialDecryptionService;
import com.corp.iot.ingestion.external.dialect.ExternalDbDialect;
import com.corp.iot.ingestion.external.dialect.ExternalDbDialects;
import com.corp.iot.ingestion.external.dto.ExternalReadingEvent;
import com.corp.iot.ingestion.external.dto.ExternalSourceCredential;
import com.corp.iot.ingestion.external.dto.ExternalSourceQueryConfig;
import com.corp.iot.ingestion.external.entity.ExternalSource;
import com.corp.iot.ingestion.external.entity.ExternalSourceJob;
import com.corp.iot.ingestion.external.producer.ExternalDataRawProducer;
import com.corp.iot.ingestion.external.producer.ExternalMessageIdGenerator;
import com.corp.iot.ingestion.external.util.ExternalSqlSupport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// Chạy câu SQL do người dùng viết trên database ngoài bằng JDBC thuần (không qua Hibernate —
// schema DB ngoài không biết trước), unbundle mỗi cột/dòng thành 1 Kafka message (xem
// ARCHITECTURE.md § Flow: External source data).
//
// Từ V12: không còn build query từ config. Câu SQL là của người dùng, hệ thống chỉ bind :cursor.
// An toàn dựa vào phiên chỉ-đọc của dialect + timeout + trần dòng, không còn dựa vào allowlist định danh.
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalQueryExecutorService {

    private final CredentialDecryptionService credentialDecryptionService;
    private final ExternalMessageIdGenerator messageIdGenerator;
    private final ExternalDataRawProducer externalDataRawProducer;
    private final ExternalSqlSupport sqlSupport;
    private final ExternalDbDialects dialects;
    private final ObjectMapper objectMapper;

    @Value("${app.external.query-timeout-seconds}")
    private int queryTimeoutSeconds;

    @Value("${app.external.max-rows-per-run}")
    private int maxRowsPerRun;

    public ExecutionResult execute(ExternalSourceJob job, ExternalSource source) {
        ExternalSourceQueryConfig queryConfig = job.getQueryConfig();
        if (queryConfig == null || queryConfig.sql() == null || queryConfig.timestampColumn() == null) {
            return ExecutionResult.failed("query_config thiếu sql hoặc timestampColumn");
        }

        ExternalSourceCredential credential;
        try {
            String decrypted = credentialDecryptionService.decrypt(source.getCredentialEncrypted());
            credential = objectMapper.readValue(decrypted, ExternalSourceCredential.class);
        } catch (Exception e) {
            return ExecutionResult.failed("Failed to decrypt credential: " + e.getMessage());
        }

        ExternalSqlSupport.PreparedSql prepared = sqlSupport.toPreparedSql(queryConfig.sql());
        Instant cursor = sqlSupport.parseCursor(job.getIncrementalCursor());
        String correlationId = UUID.randomUUID().toString();

        try {
            ExternalDbDialect dialect = dialects.of(source.getConnectionType());
            try (Connection connection = dialect.open(source.getConnectionConfig(), credential);
                 PreparedStatement statement = connection.prepareStatement(prepared.sql())) {
                statement.setQueryTimeout(queryTimeoutSeconds);
                statement.setMaxRows(maxRowsPerRun);
                for (int i = 1; i <= prepared.cursorParamCount(); i++) {
                    statement.setTimestamp(i, Timestamp.from(cursor));
                }

                int rowCount = 0;
                Instant maxMeasuredAt = null;
                try (ResultSet rs = statement.executeQuery()) {
                    List<String> valueColumns = readValueColumns(rs.getMetaData(), queryConfig.timestampColumn());
                    while (rs.next()) {
                        rowCount++;
                        Instant measuredAt = dialect.toInstant(rs.getObject(queryConfig.timestampColumn()));
                        if (measuredAt == null) {
                            continue;
                        }
                        if (maxMeasuredAt == null || measuredAt.isAfter(maxMeasuredAt)) {
                            maxMeasuredAt = measuredAt;
                        }
                        publishRow(job, source, valueColumns, rs, measuredAt, correlationId);
                    }
                }
                return ExecutionResult.success(rowCount, maxMeasuredAt);
            }
        } catch (Exception e) {
            log.error("External query failed jobId={}", job.getId(), e);
            return ExecutionResult.failed(truncate(e.getMessage()));
        }
    }

    // Cột dữ liệu suy từ kết quả thật (mọi cột trừ cột thời gian) — người dùng không phải khai
    // valueColumns nữa, thêm cột vào SELECT là có ngay field mới để gắn datastream.
    private List<String> readValueColumns(ResultSetMetaData metaData, String timestampColumn) throws SQLException {
        List<String> columns = new ArrayList<>();
        for (int i = 1; i <= metaData.getColumnCount(); i++) {
            String label = metaData.getColumnLabel(i);
            if (!label.equalsIgnoreCase(timestampColumn)) {
                columns.add(label);
            }
        }
        return columns;
    }

    private void publishRow(ExternalSourceJob job, ExternalSource source, List<String> valueColumns,
                            ResultSet rs, Instant measuredAt, String correlationId) throws SQLException {
        for (String column : valueColumns) {
            Double value = sqlSupport.toDouble(rs.getObject(column));
            if (value == null) {
                continue;
            }
            String messageId = messageIdGenerator.generate(job.getId(), column, measuredAt);
            ExternalReadingEvent event = new ExternalReadingEvent(
                    messageId, job.getTenantId(), source.getTenantNodeId(), job.getId(), column, value, measuredAt,
                    false);
            externalDataRawProducer.send(event, correlationId);
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
