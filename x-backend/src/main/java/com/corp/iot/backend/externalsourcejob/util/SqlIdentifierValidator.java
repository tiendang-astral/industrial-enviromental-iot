package com.corp.iot.backend.externalsourcejob.util;

import com.corp.iot.backend.common.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

// table/column trong query_config/filter_config không parameterize được trong JDBC (identifier,
// không phải value) — allowlist regex chặn SQL injection qua tên bảng/cột (xem ARCHITECTURE.md
// § Flow: External source data). x-ingestion-service re-validate defensive lúc build query thật.
@Component
public class SqlIdentifierValidator {

    private static final Pattern ALLOWED = Pattern.compile("^[a-zA-Z_][a-zA-Z0-9_]{0,62}$");

    public void validate(String identifier) {
        if (identifier == null || !ALLOWED.matcher(identifier).matches()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_IDENTIFIER",
                    "Tên bảng/cột không hợp lệ: " + identifier);
        }
    }
}
