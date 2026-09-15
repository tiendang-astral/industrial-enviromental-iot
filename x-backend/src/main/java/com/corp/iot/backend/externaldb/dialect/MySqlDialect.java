package com.corp.iot.backend.externaldb.dialect;

import com.corp.iot.backend.externalsource.dto.ExternalSourceConnectionConfig;
import com.corp.iot.backend.externalsource.dto.ExternalSourceCredential;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;
import java.util.regex.Pattern;

// MySQL và MariaDB dùng chung dialect này.
@Component
public class MySqlDialect implements ExternalDbDialect {

    public static final String TYPE = "MYSQL";

    // Ngoài hai dạng như Postgres, MySQL còn "LIMIT offset, count".
    private static final Pattern TRAILING_LIMIT = Pattern.compile(
            "\\s+LIMIT\\s+\\d+(\\s*,\\s*\\d+|\\s+OFFSET\\s+\\d+)?\\s*$", Pattern.CASE_INSENSITIVE);

    // information_schema ghi GRANTEE dạng 'user'@'host', còn CURRENT_USER() trả user@host.
    private static final String GRANTEE = "CONCAT('''', SUBSTRING_INDEX(CURRENT_USER(), '@', 1), '''@''', "
            + "SUBSTRING_INDEX(CURRENT_USER(), '@', -1), '''')";
    private static final String WRITE_PRIVILEGES = "PRIVILEGE_TYPE IN ('INSERT', 'UPDATE', 'DELETE')";

    @Override
    public String type() {
        return TYPE;
    }

    // Driver MariaDB (LGPL) kết nối được cả MySQL lẫn MariaDB; driver chính hãng của MySQL là GPL.
    // allowPublicKeyRetrieval: MySQL 8 đăng nhập bằng caching_sha2_password, không mã hoá thì phải lấy khoá công khai của máy chủ.
    @Override
    public String jdbcUrl(ExternalSourceConnectionConfig config) {
        String sslMode = config.sslMode() == null || "disable".equals(config.sslMode()) ? "disable" : "trust";
        return "jdbc:mariadb://%s:%d/%s?sslMode=%s&allowPublicKeyRetrieval=true&connectTimeout=10000"
                .formatted(config.host(), config.port(), config.database(), sslMode);
    }

    // Phiên READ ONLY: máy chủ từ chối ghi mọi bảng thật và mọi DDL (lỗi 1792) — cùng mức với readOnlyMode của Postgres.
    @Override
    public Connection open(ExternalSourceConnectionConfig config, ExternalSourceCredential credential)
            throws SQLException {
        Connection connection = DriverManager.getConnection(jdbcUrl(config), credential.username(), credential.password());
        try (Statement statement = connection.createStatement()) {
            statement.execute("SET SESSION TRANSACTION READ ONLY");
        } catch (SQLException e) {
            connection.close();
            throw e;
        }
        return connection;
    }

    @Override
    public String quoteIdentifier(String identifier) {
        return "`" + identifier.replace("`", "``") + "`";
    }

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

    // Với MySQL, database chính là schema — chỉ liệt kê database đang kết nối.
    @Override
    public String schemaSql() {
        return """
                SELECT c.TABLE_SCHEMA AS table_schema,
                       c.TABLE_NAME   AS table_name,
                       c.COLUMN_NAME  AS column_name,
                       c.DATA_TYPE    AS data_type,
                       t.TABLE_ROWS   AS estimated_rows
                FROM   information_schema.COLUMNS c
                JOIN   information_schema.TABLES t
                       ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
                WHERE  c.TABLE_SCHEMA = DATABASE()
                ORDER  BY c.TABLE_NAME, c.ORDINAL_POSITION
                """;
    }

    @Override
    public String countTablesSql() {
        return "SELECT count(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()";
    }

    // Quyền cấp qua ROLE của MySQL 8 không hiện ở information_schema nên có thể báo thiếu — chỉ là cảnh báo mềm.
    @Override
    public String writeAccessSql() {
        return """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.USER_PRIVILEGES
                    WHERE  GRANTEE = %1$s AND %2$s
                    UNION ALL
                    SELECT 1 FROM information_schema.SCHEMA_PRIVILEGES
                    WHERE  GRANTEE = %1$s AND TABLE_SCHEMA = DATABASE() AND %2$s
                    UNION ALL
                    SELECT 1 FROM information_schema.TABLE_PRIVILEGES
                    WHERE  GRANTEE = %1$s AND TABLE_SCHEMA = DATABASE() AND %2$s
                )
                """.formatted(GRANTEE, WRITE_PRIVILEGES);
    }

    @Override
    public String explain(SQLException e, int queryTimeoutSeconds) {
        if (isTimeout(e)) {
            return "Truy vấn chạy quá lâu và đã bị dừng (giới hạn " + queryTimeoutSeconds + " giây)";
        }
        String message = e.getMessage() != null ? e.getMessage() : "";
        String state = e.getSQLState() != null ? e.getSQLState() : "";
        if (state.startsWith("08") && message.toLowerCase(Locale.ROOT).contains("ssl")) {
            return SSL_NOT_SUPPORTED;
        }
        return switch (e.getErrorCode()) {
            case 1045 -> "Sai tài khoản hoặc mật khẩu";
            case 1044 -> "Tài khoản không có quyền truy cập database này";
            case 1049 -> "Database không tồn tại trên máy chủ";
            default -> state.startsWith("08")
                    ? "Không kết nối được tới máy chủ — kiểm tra host, cổng và tường lửa"
                    : message;
        };
    }

    // 3024: max_execution_time của MySQL; 1969: max_statement_time của MariaDB.
    @Override
    public boolean isTimeout(SQLException e) {
        return e instanceof SQLTimeoutException || "70100".equals(e.getSQLState())
                || e.getErrorCode() == 3024 || e.getErrorCode() == 1969;
    }

    @Override
    public boolean isTimestampType(String dataType) {
        return dataType != null && switch (dataType.toLowerCase(Locale.ROOT)) {
            case "datetime", "timestamp" -> true;
            default -> false;
        };
    }

    @Override
    public boolean isNumericType(String dataType) {
        return dataType != null && switch (dataType.toLowerCase(Locale.ROOT)) {
            case "tinyint", "smallint", "mediumint", "int", "integer", "bigint", "decimal", "numeric", "float",
                 "double", "real" -> true;
            default -> false;
        };
    }

    // DATETIME không có múi giờ — hiểu theo múi giờ JVM, cùng cách driver đổi sang Timestamp.
    @Override
    public Instant toInstant(Object value) {
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.atZone(ZoneId.systemDefault()).toInstant();
        }
        return ExternalDbDialect.super.toInstant(value);
    }
}
