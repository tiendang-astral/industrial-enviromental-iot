package com.corp.iot.backend.externalsource.mapper;

import com.corp.iot.backend.externalsource.dto.ExternalSourceResponse;
import com.corp.iot.backend.externalsource.entity.ExternalSource;
import org.springframework.stereotype.Component;

@Component
public class ExternalSourceMapper {

    public ExternalSourceResponse toResponse(ExternalSource source) {
        return new ExternalSourceResponse(
                source.getId(),
                source.getTenantNodeId(),
                source.getName(),
                source.getConnectionType(),
                source.getConnectionConfig(),
                source.getLastSyncStatus(),
                source.getLastSyncAt(),
                source.getLastError()
        );
    }
}
