package com.corp.iot.backend.externaldb.dialect;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.externalsource.dto.ExternalSourceConnectionConfig;
import com.corp.iot.backend.externalsource.dto.ExternalSourceCredential;
import microsoft.sql.DateTimeOffset;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.time.Instant;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class SqlServerDialect implements ExternalDbDialect {

    public static final String TYPE = "SQLSERVER";

    // Các pattern dưới đây chạy trên bản đã qua SqlText.maskNested: nội dung trong ngoặc chỉ còn khoảng trắng.
    private static final String NAME = "(?:\\[[^\\]]*\\]|\"[^\"]*\"|[A-Za-z_#@][\\w$#@]*)";
    private static final String CTE = NAME + "\\s*(?:\\([ ]*\\)\\s*)?AS\\s*\\([ ]*\\)";
    private static final Pattern CTE_PREFIX = Pattern.compile(
            "^\\s*WITH\\s+" + CTE + "(?:\\s*,\\s*" + CTE + ")*\\s*", Pattern.CASE_INSENSITIVE);
    private static final Pattern LEADING_WITH = Pattern.compile("^\\s*WITH\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern LEADING_SELECT = Pattern.compile("^SELECT\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern TOP = Pattern.compile(
            "^\\s*SELECT\\s+(?:(?:ALL|DISTINCT)\\s+)?(TOP\\s*(?:\\d+|\\([ ]*\\))(?:\\s+PERCENT)?(?:\\s+WITH\\s+TIES)?\\s*)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern TRAILING_OFFSET = Pattern.compile(
            "\\s+OFFSET\\s+(?:\\d+|\\([ ]*\\))\\s+ROWS?"
                    + "(?:\\s+FETCH\\s+(?:NEXT|FIRST)\\s+(?:\\d+|\\([ ]*\\))\\s+ROWS?\\s+ONLY)?\\s*$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern ORDER_BY = Pattern.compile("\\bORDER\\s+BY\\b", Pattern.CASE_INSENSITIVE);

    @Override
    public String type() {
        return TYPE;
    }

    // loginTimeout=10 cho khớp Postgres — mặc định của driver giữ form thử kết nối treo lâu hơn hẳn.
    // Bật mã hoá thì tin chứng chỉ máy chủ: SQL Server tự sinh chứng chỉ tự ký khi cài, kiểm tra thì gần như luôn lỗi.
    @Override
    public String jdbcUrl(ExternalSourceConnectionConfig config) {
        String encryption = config.sslMode() == null || "disable".equals(config.sslMode())
                ? "encrypt=false"
                : "encrypt=true;trustServerCertificate=true";
        return "jdbc:sqlserver://%s:%d;databaseName={%s};%s;loginTimeout=10;applicationName=iiot-platform"
                .formatted(config.host(), config.port(), config.database().replace("}", "}}"), encryption);
    }

    @Override
    public Connection open(ExternalSourceConnectionConfig config, ExternalSourceCredential credential)
            throws SQLException {
        Connection connection = DriverManager.getConnection(jdbcUrl(config), credential.username(), credential.password());
        try {
            connection.setAutoCommit(false);
        } catch (SQLException e) {
            connection.close();
            throw e;
        }
        return rollbackOnClose(connection);
    }

    // SQL Server không có phiên READ ONLY phía máy chủ như Postgres: mọi câu chạy trong một transaction
    // không bao giờ commit — lỡ có lệnh ghi lọt qua SqlQueryValidator thì cũng bị huỷ lúc đóng.
    static Connection rollbackOnClose(Connection connection) {
        return (Connection) Proxy.newProxyInstance(
                SqlServerDialect.class.getClassLoader(),
                new Class<?>[]{Connection.class},
                (proxy, method, args) -> {
                    if ("close".equals(method.getName())) {
                        try {
                            if (!connection.isClosed()) {
                                connection.rollback();
                            }
                        } finally {
                            connection.close();
                        }
                        return null;
                    }
                    try {
                        return method.invoke(connection, args);
                    } catch (InvocationTargetException e) {
                        throw e.getCause();
                    }
                });
    }

    @Override
    public String quoteIdentifier(String identifier) {
        return "[" + identifier.replace("]", "]]") + "]";
    }

    // T-SQL không cho ORDER BY trong bảng con nếu thiếu TOP/OFFSET, nên phải gỡ cả ORDER BY lẫn TOP của câu chính.
    @Override
    public String toInnerSql(String sql) {
        String cleaned = SqlText.stripTrailingSemicolon(SqlText.stripComments(sql).trim()).trim();
        CteSplit split = splitCte(cleaned);
        String body = split.body();
        String masked = SqlText.maskNested(body);

        Matcher offset = TRAILING_OFFSET.matcher(masked);
        if (offset.find()) {
            body = body.substring(0, offset.start());
            masked = masked.substring(0, offset.start());
        }
        int orderBy = lastMatchStart(ORDER_BY, masked);
        if (orderBy >= 0) {
            body = body.substring(0, orderBy);
            masked = masked.substring(0, orderBy);
        }
        Matcher top = TOP.matcher(masked);
        if (top.find()) {
            body = body.substring(0, top.start(1)) + body.substring(top.end(1));
        }
        return join(split.prefix(), body.trim());
    }

    // T-SQL không cho WITH nằm trong bảng con — kéo nó ra trước câu ngoài.
    @Override
    public String wrapDerived(String innerSql, String selectList, String tail) {
        CteSplit split = splitCte(innerSql.trim());
        String wrapped = "SELECT " + selectList + " FROM (" + split.body() + ") t" + (tail.isBlank() ? "" : " " + tail);
        return join(split.prefix(), wrapped);
    }

    @Override
    public String schemaSql() {
        return """
                SELECT c.TABLE_SCHEMA AS table_schema,
                       c.TABLE_NAME   AS table_name,
                       c.COLUMN_NAME  AS column_name,
                       c.DATA_TYPE    AS data_type,
                       r.row_count    AS estimated_rows
                FROM   INFORMATION_SCHEMA.COLUMNS c
                LEFT JOIN (
                    SELECT p.object_id, SUM(p.rows) AS row_count
                    FROM   sys.partitions p
                    WHERE  p.index_id IN (0, 1)
                    GROUP  BY p.object_id
                ) r ON r.object_id = OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME))
                WHERE  c.TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
                ORDER  BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION
                """;
    }

    @Override
    public String countTablesSql() {
        return """
                SELECT count(*)
                FROM   INFORMATION_SCHEMA.TABLES
                WHERE  TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
                """;
    }

    // HAS_PERMS_BY_NAME tính cả quyền có được qua role (db_datawriter, db_owner), giống has_table_privilege của Postgres.
    @Override
    public String writeAccessSql() {
        return """
                SELECT CASE WHEN EXISTS (
                    SELECT 1
                    FROM   sys.tables t
                    JOIN   sys.schemas s ON s.schema_id = t.schema_id
                    WHERE  t.is_ms_shipped = 0
                      AND  (HAS_PERMS_BY_NAME(QUOTENAME(s.name) + '.' + QUOTENAME(t.name), 'OBJECT', 'INSERT') = 1
                        OR HAS_PERMS_BY_NAME(QUOTENAME(s.name) + '.' + QUOTENAME(t.name), 'OBJECT', 'UPDATE') = 1
                        OR HAS_PERMS_BY_NAME(QUOTENAME(s.name) + '.' + QUOTENAME(t.name), 'OBJECT', 'DELETE') = 1)
                ) THEN 1 ELSE 0 END
                """;
    }

    @Override
    public String explain(SQLException e, int queryTimeoutSeconds) {
        if (isTimeout(e)) {
            return "Truy vấn chạy quá lâu và đã bị dừng (giới hạn " + queryTimeoutSeconds + " giây)";
        }
        return switch (e.getErrorCode()) {
            case 18456 -> "Sai tài khoản hoặc mật khẩu";
            case 4060 -> "Database không tồn tại hoặc tài khoản không có quyền truy cập";
            default -> "08S01".equals(e.getSQLState())
                    ? "Không kết nối được tới máy chủ — kiểm tra host, cổng và tường lửa"
                    : e.getMessage();
        };
    }

    @Override
    public boolean isTimeout(SQLException e) {
        return e instanceof SQLTimeoutException || "HY008".equals(e.getSQLState());
    }

    @Override
    public boolean isTimestampType(String dataType) {
        return dataType != null && switch (dataType.toLowerCase(Locale.ROOT)) {
            case "datetime", "datetime2", "smalldatetime", "datetimeoffset" -> true;
            default -> false;
        };
    }

    @Override
    public boolean isNumericType(String dataType) {
        return dataType != null && switch (dataType.toLowerCase(Locale.ROOT)) {
            case "tinyint", "smallint", "int", "bigint", "decimal", "numeric", "float", "real", "money",
                 "smallmoney" -> true;
            default -> false;
        };
    }

    @Override
    public Instant toInstant(Object value) {
        if (value instanceof DateTimeOffset offset) {
            return offset.getTimestamp().toInstant();
        }
        return ExternalDbDialect.super.toInstant(value);
    }

    private CteSplit splitCte(String sql) {
        if (!LEADING_WITH.matcher(sql).find()) {
            return new CteSplit("", sql);
        }
        Matcher matcher = CTE_PREFIX.matcher(SqlText.maskNested(sql));
        if (!matcher.find() || !LEADING_SELECT.matcher(sql.substring(matcher.end())).find()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_QUERY",
                    "Không tách được mệnh đề WITH ra khỏi câu SELECT chính — kiểm tra lại cú pháp WITH ... AS (...)");
        }
        return new CteSplit(sql.substring(0, matcher.end()).trim(), sql.substring(matcher.end()).trim());
    }

    private static int lastMatchStart(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        int last = -1;
        while (matcher.find()) {
            last = matcher.start();
        }
        return last;
    }

    private static String join(String prefix, String body) {
        return prefix.isEmpty() ? body : prefix + " " + body;
    }

    private record CteSplit(String prefix, String body) {
    }
}
