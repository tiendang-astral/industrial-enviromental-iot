package com.corp.iot.backend.externaldb.dialect;

import com.corp.iot.backend.externalsource.dto.ExternalSourceConnectionConfig;
import com.corp.iot.backend.externalsource.dto.ExternalSourceCredential;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;

// Mọi khác biệt giữa các loại database ngoài nằm sau interface này — ExternalDbGateway không biết mình
// đang nói chuyện với loại nào. x-ingestion-service có bản tương đương cho luồng chạy nền.
public interface ExternalDbDialect {

    /** Chọn "Có mã hoá" nhưng máy chủ database chưa bật SSL/TLS. */
    String SSL_NOT_SUPPORTED =
            "Máy chủ chưa bật mã hoá kết nối — chọn \"Không mã hoá\" hoặc bật SSL trên máy chủ database";

    /** Giá trị của cột external_source.connection_type. */
    String type();

    String jdbcUrl(ExternalSourceConnectionConfig config);

    /** Kết nối đã khoá chỉ-đọc bằng cơ chế mạnh nhất loại database đó cho phép. */
    Connection open(ExternalSourceConnectionConfig config, ExternalSourceCredential credential) throws SQLException;

    String quoteIdentifier(String identifier);

    /**
     * Câu người dùng dùng làm bảng con (đếm ước lượng, lấy mẫu mới nhất): bỏ comment và mệnh đề giới
     * hạn số dòng ở cuối — giữ lại thì phép đếm luôn trả về đúng con số giới hạn đó.
     */
    String toInnerSql(String sql);

    /** {@code SELECT <selectList> FROM (<innerSql>) t <tail>} theo cú pháp của loại database này. */
    String wrapDerived(String innerSql, String selectList, String tail);

    /** Cột trả về: table_schema, table_name, column_name, data_type, estimated_rows. */
    String schemaSql();

    String countTablesSql();

    /** Một dòng, một cột boolean: tài khoản có quyền INSERT/UPDATE/DELETE trên ít nhất một bảng. */
    String writeAccessSql();

    String explain(SQLException e, int queryTimeoutSeconds);

    boolean isTimeout(SQLException e);

    boolean isTimestampType(String dataType);

    boolean isNumericType(String dataType);

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
