package com.corp.iot.backend.externalsourcejob.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

// startFrom quyết định mốc đọc đầu tiên; startFromDate chỉ bắt buộc khi startFrom = FROM_DATE.
public record CreateExternalSourceJobRequest(
        @NotBlank String name,
        @NotNull @Valid ExternalSourceQueryConfig queryConfig,
        @NotBlank String scheduleCron,
        @NotNull StartFrom startFrom,
        Instant startFromDate
) {
}
