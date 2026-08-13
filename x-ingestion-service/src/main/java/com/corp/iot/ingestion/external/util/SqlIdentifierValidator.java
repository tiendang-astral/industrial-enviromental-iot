package com.corp.iot.ingestion.external.util;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

// Re-validate defensive lúc build query thật (table/column không parameterize được trong
// JDBC) — x-backend đã validate lúc tạo job, đây là lớp phòng thủ thứ 2 phòng khi dữ liệu
// trong DB bị chỉnh tay/khác nguồn (xem ARCHITECTURE.md § Flow: External source data).
@Component
public class SqlIdentifierValidator {

    private static final Pattern ALLOWED = Pattern.compile("^[a-zA-Z_][a-zA-Z0-9_]{0,62}$");

    public boolean isValid(String identifier) {
        return identifier != null && ALLOWED.matcher(identifier).matches();
    }
}
