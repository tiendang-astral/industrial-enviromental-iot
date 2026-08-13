package com.corp.iot.backend.externalsourcejob.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

// queryConfig/filterConfig/scheduleCron null = giữ nguyên; đổi queryConfig/filterConfig/
// scheduleCron sẽ reset incrementalCursor (xem ExternalSourceJobServiceImpl).
public record UpdateExternalSourceJobRequest(
        @NotBlank String name,
        @Valid ExternalSourceQueryConfig queryConfig,
        List<@Valid ExternalSourceFilter> filterConfig,
        String scheduleCron
) {
}
