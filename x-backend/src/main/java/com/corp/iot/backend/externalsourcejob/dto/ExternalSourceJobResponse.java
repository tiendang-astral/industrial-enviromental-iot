package com.corp.iot.backend.externalsourcejob.dto;

import java.time.Instant;

public record ExternalSourceJobResponse(
        Long id,
        Long externalSourceId,
        String name,
        ExternalSourceQueryConfig queryConfig,
        String scheduleCron,
        String incrementalCursor,
        Long totalRowCount,
        String lastRunStatus,
        Instant lastRunAt,
        Instant nextRunAt,
        String lastError
) {
}
