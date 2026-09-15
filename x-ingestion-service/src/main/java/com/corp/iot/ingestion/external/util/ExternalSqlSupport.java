package com.corp.iot.ingestion.external.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Phần dùng chung giữa luồng chạy theo lịch và luồng vá lịch sử, không phụ thuộc loại database: đổi
// :cursor thành tham số, ép kiểu giá trị đọc về. Chuỗi kết nối và cú pháp riêng nằm ở external/dialect.
@Slf4j
@Component
public class ExternalSqlSupport {

    private static final Pattern CURSOR = Pattern.compile(":cursor\\b");

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

    // Từ V12 cursor luôn có giá trị; job cũ hỏng dữ liệu thì đọc lại từ đầu thay vì chết.
    public Instant parseCursor(String cursor) {
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
