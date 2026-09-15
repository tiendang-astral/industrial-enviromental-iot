package com.corp.iot.ingestion.external.dialect;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// CHECK constraint có thể giữ chỗ trước cho loại chưa có dialect — job của loại đó FAILED rõ lý do.
@Component
public class ExternalDbDialects {

    private final Map<String, ExternalDbDialect> byType;

    public ExternalDbDialects(List<ExternalDbDialect> dialects) {
        this.byType = dialects.stream().collect(Collectors.toUnmodifiableMap(ExternalDbDialect::type, Function.identity()));
    }

    public ExternalDbDialect of(String connectionType) {
        ExternalDbDialect dialect = connectionType != null ? byType.get(connectionType) : null;
        if (dialect == null) {
            throw new IllegalArgumentException("Loại kết nối chưa được hỗ trợ: " + connectionType);
        }
        return dialect;
    }
}
