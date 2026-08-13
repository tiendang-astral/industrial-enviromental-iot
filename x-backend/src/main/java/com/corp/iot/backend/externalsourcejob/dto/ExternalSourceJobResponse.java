package com.corp.iot.backend.externalsourcejob.dto;

import java.time.Instant;
import java.util.List;

public record ExternalSourceJobResponse(
        Long id,
        Long externalSourceId,
        String name,
        ExternalSourceQueryConfig queryConfig,
        List<ExternalSourceFilter> filterConfig,
        String scheduleCron,
        String incrementalCursor,
        Long totalRowCount,
        String lastRunStatus,
        Instant lastRunAt,
        Instant nextRunAt,
        String lastError
) {
}
