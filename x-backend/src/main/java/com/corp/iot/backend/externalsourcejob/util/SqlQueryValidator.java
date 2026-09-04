package com.corp.iot.backend.externalsourcejob.util;

import com.corp.iot.backend.common.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Thay cho SqlIdentifierValidator cũ: từ V12 người dùng viết SQL tự do nên allowlist định danh
// không còn ý nghĩa. Lớp bảo vệ thật là phiên READ ONLY + timeout + trần dòng ở lúc chạy; ở đây
// chỉ chặn hai thứ khiến job không chạy được: thiếu :cursor và nhiều câu lệnh trong một ô.
@Component
public class SqlQueryValidator {

    // :cursor không được nằm trong chuỗi hay comment — bỏ qua chúng trước khi tìm.
    private static final Pattern CURSOR = Pattern.compile(":cursor\\b");
    private static final Pattern LEADING_KEYWORD = Pattern.compile("^\\s*(SELECT|WITH)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern STRING_LITERAL = Pattern.compile("'([^']|'')*'");
    private static final Pattern LINE_COMMENT = Pattern.compile("--[^\\n]*");
    private static final Pattern BLOCK_COMMENT = Pattern.compile("/\\*.*?\\*/", Pattern.DOTALL);

    public void validate(String sql) {
        if (sql == null || sql.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_QUERY", "Câu truy vấn không được để trống");
        }
        String stripped = strip(sql);

        if (!LEADING_KEYWORD.matcher(stripped).find()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_QUERY",
                    "Câu truy vấn phải bắt đầu bằng SELECT hoặc WITH");
        }
        if (stripped.replaceAll(";\\s*$", "").contains(";")) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_QUERY",
                    "Chỉ chạy được một câu lệnh — bỏ dấu chấm phẩy ở giữa câu truy vấn");
        }
        if (!CURSOR.matcher(stripped).find()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "MISSING_CURSOR_PLACEHOLDER",
                    "Câu truy vấn phải chứa :cursor ở điều kiện thời gian, ví dụ: WHERE measured_at > :cursor");
        }
    }

    // Đổi :cursor thành ? để bind qua PreparedStatement, giữ nguyên phần còn lại của câu.
    // Trả về số lần xuất hiện để nơi gọi bind đủ tham số.
    public PreparedSql toPreparedSql(String sql) {
        Matcher matcher = CURSOR.matcher(sql);
        StringBuilder out = new StringBuilder();
        int count = 0;
        while (matcher.find()) {
            // Bỏ qua :cursor nằm trong chuỗi/comment — chúng không phải tham số thật.
            if (insideStringOrComment(sql, matcher.start())) {
                continue;
            }
            matcher.appendReplacement(out, "?");
            count++;
        }
        matcher.appendTail(out);
        return new PreparedSql(out.toString(), count);
    }

    // Câu của người dùng dùng làm BẢNG CON cho backfill (đọc lùi) và cho phép đếm ước lượng.
    // Phải bỏ comment (bảng con không cần) và gỡ LIMIT/OFFSET cuối câu — giữ lại thì mọi lô đều
    // trả về đúng bấy nhiêu dòng tính từ đích, tức là đếm sai và vá sai.
    public String toInnerSql(String sql) {
        String withoutComments = stripComments(sql).trim();
        String withoutSemicolon = TRAILING_SEMICOLON.matcher(withoutComments).replaceAll("");
        return TRAILING_LIMIT.matcher(withoutSemicolon).replaceAll("").trim();
    }

    // LIMIT nằm trong bảng con của chính người dùng (kết thúc bằng dấu đóng ngoặc) thuộc về bảng
    // con đó, không phải câu ngoài — vì vậy chỉ neo vào cuối câu, không quét toàn bộ.
    private static final Pattern TRAILING_LIMIT = Pattern.compile(
            "\\s+LIMIT\\s+\\d+(\\s+OFFSET\\s+\\d+)?\\s*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern TRAILING_SEMICOLON = Pattern.compile(";\\s*$");

    // Quét một lượt, giữ nguyên chuỗi literal — khác strip() bên dưới vốn xoá luôn nội dung chuỗi
    // (chấp nhận được khi chỉ để kiểm tra cú pháp, nhưng sẽ phá câu nếu đem đi chạy thật).
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

    private String strip(String sql) {
        return BLOCK_COMMENT.matcher(LINE_COMMENT.matcher(STRING_LITERAL.matcher(sql).replaceAll("''"))
                .replaceAll("")).replaceAll("");
    }

    public record PreparedSql(String sql, int cursorParamCount) {
    }
}
