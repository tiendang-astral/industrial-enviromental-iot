package com.corp.iot.backend.externaldb.dialect;

import com.corp.iot.backend.externalsource.dto.ExternalSourceConnectionConfig;
import com.corp.iot.backend.externalsource.dto.ExternalSourceCredential;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.regex.Pattern;

@Component
public class PostgresDialect implements ExternalDbDialect {

    public static final String TYPE = "POSTGRESQL";

    private static final Pattern TRAILING_LIMIT = Pattern.compile(
            "\\s+LIMIT\\s+\\d+(\\s+OFFSET\\s+\\d+)?\\s*$", Pattern.CASE_INSENSITIVE);

    @Override
    public String type() {
        return TYPE;
    }

    // readOnlyMode=always là thứ thực sự cưỡng chế chỉ-đọc: driver gửi
    // SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY ngay khi mở kết nối.
    // KHÔNG bỏ tham số này — với mặc định (readOnlyMode=transaction) thì setReadOnly(true)
    // chỉ có tác dụng khi autocommit tắt, tức là no-op ở đây, và một câu
    // "WITH x AS (DELETE ... RETURNING ...) SELECT * FROM x" sẽ xoá thật dữ liệu khách hàng.
    @Override
    public String jdbcUrl(ExternalSourceConnectionConfig config) {
        String sslMode = config.sslMode() != null ? config.sslMode() : "disable";
        return "jdbc:postgresql://%s:%d/%s?sslmode=%s&readOnlyMode=always"
                .formatted(config.host(), config.port(), config.database(), sslMode);
    }

    @Override
    public Connection open(ExternalSourceConnectionConfig config, ExternalSourceCredential credential)
            throws SQLException {
        Connection connection = DriverManager.getConnection(jdbcUrl(config), credential.username(), credential.password());
        connection.setReadOnly(true);
        return connection;
    }

    @Override
    public String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    // LIMIT nằm trong bảng con của chính người dùng (kết thúc bằng dấu đóng ngoặc) thuộc về bảng
    // con đó, không phải câu ngoài — vì vậy chỉ neo vào cuối câu, không quét toàn bộ.
    @Override
    public String toInnerSql(String sql) {
        String withoutComments = SqlText.stripComments(sql).trim();
        String withoutSemicolon = SqlText.stripTrailingSemicolon(withoutComments);
        return TRAILING_LIMIT.matcher(withoutSemicolon).replaceAll("").trim();
    }

    @Override
    public String wrapDerived(String innerSql, String selectList, String tail) {
        return "SELECT " + selectList + " FROM (" + innerSql + ") t" + (tail.isBlank() ? "" : " " + tail);
    }

    @Override
    public String schemaSql() {
        return """
                SELECT c.table_schema,
                       c.table_name,
                       c.column_name,
                       c.data_type,
                       cls.reltuples::bigint AS estimated_rows
                FROM   information_schema.columns c
                JOIN   pg_class cls ON cls.relname = c.table_name
                JOIN   pg_namespace ns ON ns.oid = cls.relnamespace AND ns.nspname = c.table_schema
                WHERE  c.table_schema NOT IN ('pg_catalog', 'information_schema')
                  AND  cls.relkind IN ('r', 'v', 'm', 'p')
                ORDER  BY c.table_schema, c.table_name, c.ordinal_position
                """;
    }

    @Override
    public String countTablesSql() {
        return """
                SELECT count(*)
                FROM   information_schema.tables
                WHERE  table_schema NOT IN ('pg_catalog', 'information_schema')
                """;
    }

    // Phải hỏi quyền Ở CẤP BẢNG, không phải has_database_privilege(..., 'CREATE') — quyền CREATE
    // chỉ nói "tạo được schema mới", nên một tài khoản có đủ INSERT/UPDATE/DELETE trên mọi bảng
    // vẫn trả về false và bị báo nhầm là chỉ-đọc (đã kiểm chứng bằng role thật trên mock DB).
    // has_table_privilege tính cả quyền thừa kế qua role, khác information_schema.table_privileges.
    @Override
    public String writeAccessSql() {
        return """
                SELECT EXISTS (
                    SELECT 1
                    FROM   pg_class c
                    JOIN   pg_namespace n ON n.oid = c.relnamespace
                    WHERE  c.relkind IN ('r', 'p')
                      AND  n.nspname NOT IN ('pg_catalog', 'information_schema')
                      AND  has_table_privilege(current_user, c.oid, 'INSERT,UPDATE,DELETE')
                )
                """;
    }

    @Override
    public String explain(SQLException e, int queryTimeoutSeconds) {
        String state = e.getSQLState();
        if (state == null) {
            return e.getMessage();
        }
        return switch (state) {
            case "28P01" -> "Sai mật khẩu cho tài khoản này";
            case "28000" -> "Tài khoản không có quyền đăng nhập vào database này";
            case "3D000" -> "Database không tồn tại trên máy chủ";
            case "08001", "08006" -> "Không kết nối được tới máy chủ — kiểm tra host, cổng và tường lửa";
            case "08004" -> e.getMessage() != null && e.getMessage().contains("SSL") ? SSL_NOT_SUPPORTED : e.getMessage();
            case "57014" -> "Truy vấn chạy quá lâu và đã bị dừng (giới hạn " + queryTimeoutSeconds + " giây)";
            default -> e.getMessage();
        };
    }

    @Override
    public boolean isTimeout(SQLException e) {
        return "57014".equals(e.getSQLState());
    }

    @Override
    public boolean isTimestampType(String dataType) {
        return dataType != null && dataType.startsWith("timestamp");
    }

    @Override
    public boolean isNumericType(String dataType) {
        return dataType != null && switch (dataType) {
            case "smallint", "integer", "bigint", "numeric", "real", "double precision" -> true;
            default -> false;
        };
    }
}
