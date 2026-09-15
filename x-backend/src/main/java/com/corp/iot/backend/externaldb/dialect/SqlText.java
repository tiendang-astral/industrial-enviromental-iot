package com.corp.iot.backend.externaldb.dialect;

import java.util.regex.Pattern;

// Xử lý văn bản SQL không phụ thuộc loại database.
final class SqlText {

    private static final Pattern TRAILING_SEMICOLON = Pattern.compile(";\\s*$");

    private SqlText() {
    }

    // Quét một lượt, giữ nguyên chuỗi literal — xoá nội dung chuỗi sẽ phá câu khi đem đi chạy.
    static String stripComments(String sql) {
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

    static String stripTrailingSemicolon(String sql) {
        return TRAILING_SEMICOLON.matcher(sql).replaceAll("");
    }

    /**
     * Bản cùng độ dài, mọi ký tự nằm trong ngoặc, chuỗi '…', định danh "…" hoặc […] bị thay bằng khoảng
     * trắng (giữ lại dấu mở/đóng ở cấp ngoài cùng). Regex chạy trên bản này chỉ khớp ở cấp ngoài cùng,
     * nên vị trí tìm được áp thẳng lên câu gốc.
     */
    static String maskNested(String sql) {
        StringBuilder out = new StringBuilder(sql.length());
        int depth = 0;
        char closing = 0;
        for (int i = 0; i < sql.length(); i++) {
            char c = sql.charAt(i);
            if (closing != 0) {
                if (c == closing && i + 1 < sql.length() && sql.charAt(i + 1) == closing) {
                    out.append("  ");
                    i++;
                } else if (c == closing) {
                    closing = 0;
                    out.append(depth == 0 ? c : ' ');
                } else {
                    out.append(' ');
                }
                continue;
            }
            switch (c) {
                case '\'', '"' -> {
                    closing = c;
                    out.append(depth == 0 ? c : ' ');
                }
                case '[' -> {
                    closing = ']';
                    out.append(depth == 0 ? c : ' ');
                }
                case '(' -> {
                    out.append(depth == 0 ? c : ' ');
                    depth++;
                }
                case ')' -> {
                    depth = Math.max(0, depth - 1);
                    out.append(depth == 0 ? c : ' ');
                }
                default -> out.append(depth == 0 ? c : ' ');
            }
        }
        return out.toString();
    }
}
