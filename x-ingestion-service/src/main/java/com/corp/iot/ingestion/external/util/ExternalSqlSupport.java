package com.corp.iot.ingestion.external.util;

import com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Phần dùng chung giữa luồng chạy theo lịch và luồng vá lịch sử: dựng chuỗi kết nối, đổi
// :cursor thành tham số, ép kiểu giá trị đọc về. Tách ra để hai luồng không lệch nhau —
// đặc biệt là readOnlyMode, thứ duy nhất thực sự chặn lệnh ghi lên database khách hàng.
@Component
public class ExternalSqlSupport {

    private static final Pattern CURSOR = Pattern.compile(":cursor\\b");
    private static final Pattern TRAILING_LIMIT = Pattern.compile(
            "\\s+LIMIT\\s+\\d+(\\s+OFFSET\\s+\\d+)?\\s*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern TRAILING_SEMICOLON = Pattern.compile(";\\s*$");

    // readOnlyMode=always là thứ thực sự cưỡng chế chỉ-đọc: driver gửi
    // SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY ngay khi mở kết nối.
    // KHÔNG bỏ tham số này — với mặc định (readOnlyMode=transaction) thì setReadOnly(true)
    // chỉ có tác dụng khi autocommit tắt, tức là no-op ở đây, và một câu
    // "WITH x AS (DELETE ... RETURNING ...) SELECT * FROM x" sẽ xoá thật dữ liệu khách hàng.
    public String buildJdbcUrl(ExternalSourceConnectionConfig config) {
        String sslMode = config.sslMode() != null ? config.sslMode() : "disable";
        return "jdbc:postgresql://%s:%d/%s?sslmode=%s&readOnlyMode=always"
                .formatted(config.host(), config.port(), config.database(), sslMode);
    }

    public PreparedSql toPreparedSql(String sql) {
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

    // Câu của người dùng dùng làm bảng con khi vá lịch sử: bỏ comment và gỡ LIMIT/OFFSET cuối
    // câu. Giữ lại LIMIT thì mọi lô đều trả về đúng bấy nhiêu dòng tính từ đích, tức là vá sai.
    public String toInnerSql(String sql) {
        String withoutComments = stripComments(sql).trim();
        String withoutSemicolon = TRAILING_SEMICOLON.matcher(withoutComments).replaceAll("");
        return TRAILING_LIMIT.matcher(withoutSemicolon).replaceAll("").trim();
    }

    public String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    public Instant toInstant(Object value) {
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

    public Double toDouble(Object value) {
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

    public Instant parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return Instant.EPOCH;
        }
        try {
            return Instant.parse(cursor);
        } catch (Exception e) {
            return Instant.EPOCH;
        }
    }

    // Quét một lượt, giữ nguyên chuỗi literal — xoá nội dung chuỗi sẽ phá câu khi đem đi chạy.
    private String stripComments(String sql) {
        StringBuilder out = new StringBuilder(sql.length());
        boolean inString = false;
        for (int i = 0; i < sql.length(); i++) {
            char c = sql.charAt(i);
            if (inString) {
                out.append(c);
                if (c == '\'') {
                    inString = false;
                }
                continue;
            }
            if (c == '\'') {
                inString = true;
                out.append(c);
            } else if (c == '-' && i + 1 < sql.length() && sql.charAt(i + 1) == '-') {
                int end = sql.indexOf('\n', i);
                i = end < 0 ? sql.length() : end - 1;
                out.append('\n');
            } else if (c == '/' && i + 1 < sql.length() && sql.charAt(i + 1) == '*') {
                int end = sql.indexOf("*/", i + 2);
                i = end < 0 ? sql.length() : end + 1;
                out.append(' ');
            } else {
                out.append(c);
            }
        }
        return out.toString();
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

    public record PreparedSql(String sql, int cursorParamCount) {
    }
}
