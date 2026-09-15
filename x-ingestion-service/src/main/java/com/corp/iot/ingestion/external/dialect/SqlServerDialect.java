package com.corp.iot.ingestion.external.dialect;

import com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig;
import com.corp.iot.ingestion.external.dto.ExternalSourceCredential;
import microsoft.sql.DateTimeOffset;
import org.springframework.stereotype.Component;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Instant;
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
    // không bao giờ commit — lỡ có lệnh ghi lọt qua bước kiểm tra lúc lưu thì cũng bị huỷ lúc đóng.
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
            throw new IllegalArgumentException("Không tách được mệnh đề WITH ra khỏi câu SELECT chính");
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
