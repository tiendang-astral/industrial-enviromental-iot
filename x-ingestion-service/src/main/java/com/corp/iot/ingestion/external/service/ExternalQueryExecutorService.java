package com.corp.iot.ingestion.external.service;

import com.corp.iot.ingestion.external.crypto.CredentialDecryptionService;
import com.corp.iot.ingestion.external.dto.ExternalReadingEvent;
import com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig;
import com.corp.iot.ingestion.external.dto.ExternalSourceCredential;
import com.corp.iot.ingestion.external.dto.ExternalSourceQueryConfig;
import com.corp.iot.ingestion.external.entity.ExternalSource;
import com.corp.iot.ingestion.external.entity.ExternalSourceJob;
import com.corp.iot.ingestion.external.producer.ExternalDataRawProducer;
import com.corp.iot.ingestion.external.producer.ExternalMessageIdGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Chạy câu SQL do người dùng viết trên database ngoài bằng JDBC thuần (không qua Hibernate —
// schema DB ngoài không biết trước), unbundle mỗi cột/dòng thành 1 Kafka message (xem
// ARCHITECTURE.md § Flow: External source data).
//
// Từ V12: không còn build query từ config. Câu SQL là của người dùng, hệ thống chỉ bind :cursor.
// An toàn dựa vào phiên READ ONLY (máy chủ bên kia tự từ chối lệnh ghi) + timeout + trần dòng,
// không còn dựa vào allowlist định danh.
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalQueryExecutorService {

    private static final Pattern CURSOR = Pattern.compile(":cursor\\b");

    private final CredentialDecryptionService credentialDecryptionService;
    private final ExternalMessageIdGenerator messageIdGenerator;
    private final ExternalDataRawProducer externalDataRawProducer;
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

        PreparedSql prepared = toPreparedSql(queryConfig.sql());
        Instant cursor = parseCursor(job.getIncrementalCursor());
        String jdbcUrl = buildJdbcUrl(source.getConnectionConfig());
        String correlationId = UUID.randomUUID().toString();

        try (Connection connection = DriverManager.getConnection(jdbcUrl, credential.username(), credential.password())) {
            connection.setReadOnly(true);
            try (PreparedStatement statement = connection.prepareStatement(prepared.sql())) {
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
                        Instant measuredAt = toInstant(rs.getObject(queryConfig.timestampColumn()));
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
            Double value = toDouble(rs.getObject(column));
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

    private PreparedSql toPreparedSql(String sql) {
        Matcher matcher = CURSOR.matcher(sql);
        StringBuilder out = new StringBuilder();
        int count = 0;
        while (matcher.find()) {
            if (insideStringOrComment(sql, matcher.start())) {
                continue;
            }
            matcher.appendReplacement(out, "?");
            count++;
        }
        matcher.appendTail(out);
        return new PreparedSql(out.toString(), count);
    }

    private boolean insideStringOrComment(String sql, int index) {
        String head = sql.substring(0, index);
        long quotes = head.chars().filter(c -> c == '\'').count();
        if (quotes % 2 == 1) {
            return true;
        }
        int lineStart = head.lastIndexOf('\n') + 1;
        return head.indexOf("--", lineStart) >= 0;
    }

    // Từ V12 cursor luôn có giá trị; job cũ hỏng dữ liệu thì đọc lại từ đầu thay vì chết.
    private Instant parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return Instant.EPOCH;
        }
        try {
            return Instant.parse(cursor);
        } catch (Exception e) {
            log.warn("Invalid incremental_cursor '{}', falling back to epoch", cursor);
            return Instant.EPOCH;
        }
    }

    // readOnlyMode=always là thứ thực sự cưỡng chế chỉ-đọc: driver gửi
    // SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY ngay khi mở kết nối.
    // KHÔNG bỏ tham số này — với mặc định (readOnlyMode=transaction) thì setReadOnly(true)
    // chỉ có tác dụng khi autocommit tắt, tức là no-op ở đây, và một câu
    // "WITH x AS (DELETE ... RETURNING ...) SELECT * FROM x" sẽ xoá thật dữ liệu khách hàng.
    private String buildJdbcUrl(ExternalSourceConnectionConfig config) {
        String sslMode = config.sslMode() != null ? config.sslMode() : "disable";
        return "jdbc:postgresql://%s:%d/%s?sslmode=%s&readOnlyMode=always"
                .formatted(config.host(), config.port(), config.database(), sslMode);
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

    private record PreparedSql(String sql, int cursorParamCount) {
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
