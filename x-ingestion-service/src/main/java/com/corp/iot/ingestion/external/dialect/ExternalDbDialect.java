package com.corp.iot.ingestion.external.dialect;

import com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig;
import com.corp.iot.ingestion.external.dto.ExternalSourceCredential;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;

// Bản gọn của ExternalDbDialect ở x-backend — chỉ những gì luồng chạy nền cần (CONVENTIONS.md: chấp nhận trùng giữa service).
public interface ExternalDbDialect {

    /** Giá trị của cột external_source.connection_type. */
    String type();

    String jdbcUrl(ExternalSourceConnectionConfig config);

    /** Kết nối đã khoá chỉ-đọc bằng cơ chế mạnh nhất loại database đó cho phép. */
    Connection open(ExternalSourceConnectionConfig config, ExternalSourceCredential credential) throws SQLException;

    String quoteIdentifier(String identifier);

    /** Câu người dùng dùng làm bảng con khi vá lịch sử: bỏ comment và mệnh đề giới hạn số dòng ở cuối. */
    String toInnerSql(String sql);

    /** {@code SELECT <selectList> FROM (<innerSql>) t <tail>} theo cú pháp của loại database này. */
    String wrapDerived(String innerSql, String selectList, String tail);

    default Instant toInstant(Object value) {
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
}
