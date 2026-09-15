package com.corp.iot.backend.externaldb.dialect;

import com.corp.iot.backend.common.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// Loại kết nối hợp lệ = loại có dialect. CHECK constraint ở DB có thể giữ chỗ trước cho loại chưa có dialect — chặn ở đây.
@Component
public class ExternalDbDialects {

    private final Map<String, ExternalDbDialect> byType;

    public ExternalDbDialects(List<ExternalDbDialect> dialects) {
        this.byType = dialects.stream().collect(Collectors.toUnmodifiableMap(ExternalDbDialect::type, Function.identity()));
    }

    public boolean supports(String connectionType) {
        return connectionType != null && byType.containsKey(connectionType);
    }

    public ExternalDbDialect of(String connectionType) {
        ExternalDbDialect dialect = connectionType != null ? byType.get(connectionType) : null;
        if (dialect == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CONNECTION_TYPE", "Loại kết nối không được hỗ trợ");
        }
        return dialect;
    }
}
