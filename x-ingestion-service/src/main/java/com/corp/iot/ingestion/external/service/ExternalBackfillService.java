package com.corp.iot.ingestion.external.service;

import com.corp.iot.ingestion.external.crypto.CredentialDecryptionService;
import com.corp.iot.ingestion.external.dto.ExternalReadingEvent;
import com.corp.iot.ingestion.external.dto.ExternalSourceCredential;
import com.corp.iot.ingestion.external.dto.ExternalSourceQueryConfig;
import com.corp.iot.ingestion.external.entity.Datastream;
import com.corp.iot.ingestion.external.entity.ExternalSource;
import com.corp.iot.ingestion.external.entity.ExternalSourceJob;
import com.corp.iot.ingestion.external.entity.ExternalSourceJobBackfill;
import com.corp.iot.ingestion.external.producer.ExternalDataRawProducer;
import com.corp.iot.ingestion.external.producer.ExternalMessageIdGenerator;
import com.corp.iot.ingestion.external.util.BackfillCursorPlanner;
import com.corp.iot.ingestion.external.util.ExternalSqlSupport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

// Vá lịch sử cho 1 kênh dữ liệu bằng chính câu SQL của job, chỉ đổi giá trị bind vào :cursor.
//
// Đọc LÙI (mới → cũ) chứ không tiến: dữ liệu của kênh luôn là một dải liền mạch
// [oldestReadingAt → nay], mỗi lô chỉ nới dải đó sang trái. Ngắt giữa chừng — service restart,
// hết ngân sách thời gian, lỗi kết nối — làm dải ngắn đi chứ không bao giờ thủng ở giữa.
//
// Câu SQL của người dùng chỉ có cận dưới (:cursor), nên để có cận trên phải bọc nó thành bảng
// con. Mỗi lô chặn cả hai đầu để Postgres đẩy được điều kiện xuống bảng con thay vì quét lại
// từ đích mỗi lần.
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalBackfillService {

    private final CredentialDecryptionService credentialDecryptionService;
    private final ExternalMessageIdGenerator messageIdGenerator;
    private final ExternalDataRawProducer externalDataRawProducer;
    private final ExternalSqlSupport sqlSupport;
    private final ObjectMapper objectMapper;

    @Value("${app.external.query-timeout-seconds}")
    private int queryTimeoutSeconds;

    @Value("${app.external.backfill-batch-rows}")
    private int batchRows;

    @Value("${app.external.backfill-window-hours}")
    private int windowHours;

    @Value("${app.external.backfill-time-budget-ms}")
    private long timeBudgetMs;

    public SliceResult runSlice(ExternalSourceJobBackfill task, ExternalSourceJob job,
                                ExternalSource source, Datastream datastream) {
        ExternalSourceQueryConfig queryConfig = job.getQueryConfig();
        if (queryConfig == null || queryConfig.sql() == null || queryConfig.timestampColumn() == null) {
            return SliceResult.failed("query_config thiếu sql hoặc timestampColumn");
        }
        if (datastream.getSourceField() == null) {
            return SliceResult.failed("Kênh dữ liệu không có source_field");
        }

        ExternalSourceCredential credential;
        try {
            String decrypted = credentialDecryptionService.decrypt(source.getCredentialEncrypted());
            credential = objectMapper.readValue(decrypted, ExternalSourceCredential.class);
        } catch (Exception e) {
            return SliceResult.failed("Failed to decrypt credential: " + e.getMessage());
        }

        ExternalSqlSupport.PreparedSql inner = sqlSupport.toPreparedSql(sqlSupport.toInnerSql(queryConfig.sql()));
        String column = sqlSupport.quoteIdentifier(queryConfig.timestampColumn());
        String batchSql = "SELECT * FROM (%s) t WHERE t.%s < ? ORDER BY t.%s DESC"
                .formatted(inner.sql(), column, column);

        String correlationId = UUID.randomUUID().toString();
        Instant deadline = Instant.now().plusMillis(timeBudgetMs);
        Instant cursor = task.getCursorAt();
        long rows = 0;

        try (Connection connection = DriverManager.getConnection(
                sqlSupport.buildJdbcUrl(source.getConnectionConfig()), credential.username(), credential.password())) {
            connection.setReadOnly(true);

            while (!BackfillCursorPlanner.reachedTarget(cursor, task.getTargetFrom())
                    && Instant.now().isBefore(deadline)) {
                Instant windowStart = BackfillCursorPlanner.windowStart(cursor, task.getTargetFrom(), windowHours);
                BatchResult batch = readBatch(connection, batchSql, inner.cursorParamCount(),
                        windowStart, cursor, queryConfig.timestampColumn(), datastream, job, source, correlationId);
                rows += batch.rows();
                cursor = BackfillCursorPlanner.nextCursor(windowStart, batch.rows(), batchRows, batch.oldest());
            }
        } catch (Exception e) {
            log.error("Backfill failed taskId={}", task.getId(), e);
            return SliceResult.failed(truncate(e.getMessage()), cursor, rows);
        }

        return new SliceResult(true, cursor, rows,
                BackfillCursorPlanner.reachedTarget(cursor, task.getTargetFrom()), null);
    }

    private BatchResult readBatch(Connection connection, String batchSql, int cursorParamCount,
                                  Instant windowStart, Instant cursor, String timestampColumn,
                                  Datastream datastream, ExternalSourceJob job, ExternalSource source,
                                  String correlationId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(batchSql)) {
            statement.setQueryTimeout(queryTimeoutSeconds);
            statement.setMaxRows(batchRows);
            int index = 1;
            for (; index <= cursorParamCount; index++) {
                statement.setTimestamp(index, Timestamp.from(windowStart));
            }
            statement.setTimestamp(index, Timestamp.from(cursor));

            long rows = 0;
            Instant oldest = null;
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    Instant measuredAt = sqlSupport.toInstant(rs.getObject(timestampColumn));
                    if (measuredAt == null) {
                        continue;
                    }
                    rows++;
                    if (oldest == null || measuredAt.isBefore(oldest)) {
                        oldest = measuredAt;
                    }
                    publish(rs, datastream, job, source, measuredAt, correlationId);
                }
            }
            return new BatchResult(rows, oldest);
        }
    }

    // Chỉ bắn đúng cột của kênh này — các kênh khác của job đã có dữ liệu ở khoảng thời gian
    // đó rồi, bắn cả hàng chỉ để ghi đè lại chính nó là tốn Kafka vô ích.
    private void publish(ResultSet rs, Datastream datastream, ExternalSourceJob job, ExternalSource source,
                         Instant measuredAt, String correlationId) throws SQLException {
        Double value = sqlSupport.toDouble(rs.getObject(datastream.getSourceField()));
        if (value == null) {
            return;
        }
        String messageId = messageIdGenerator.generate(job.getId(), datastream.getSourceField(), measuredAt);
        // backfill=true để Processing Service bỏ qua dedup: những dòng này đã từng bị publish
        // rồi bị vứt vì chưa có kênh, messageId vẫn còn trong Redis nên sẽ bị chặn oan.
        ExternalReadingEvent event = new ExternalReadingEvent(
                messageId, job.getTenantId(), source.getTenantNodeId(), job.getId(),
                datastream.getSourceField(), value, measuredAt, true);
        externalDataRawProducer.send(event, correlationId);
    }

    private String truncate(String message) {
        if (message == null) {
            return "Unknown error";
        }
        return message.length() > 500 ? message.substring(0, 500) : message;
    }

    /** done=true khi cursor đã chạm đích; ngược lại tác vụ còn dở, lượt sweep sau chạy tiếp. */
    public record SliceResult(boolean success, Instant cursorAt, long rowCount, boolean done, String error) {
        static SliceResult failed(String error) {
            return new SliceResult(false, null, 0, false, error);
        }

        static SliceResult failed(String error, Instant cursorAt, long rowCount) {
            return new SliceResult(false, cursorAt, rowCount, false, error);
        }
    }

    private record BatchResult(long rows, Instant oldest) {
    }
}
