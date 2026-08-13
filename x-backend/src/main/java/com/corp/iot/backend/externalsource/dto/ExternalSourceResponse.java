package com.corp.iot.backend.externalsource.dto;

import java.time.Instant;

public record ExternalSourceResponse(
        Long id,
        Long tenantNodeId,
        String name,
        String connectionType,
        ExternalSourceConnectionConfig connectionConfig,
        String lastSyncStatus,
        Instant lastSyncAt,
        String lastError
) {
}
