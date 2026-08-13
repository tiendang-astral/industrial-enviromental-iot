package com.corp.iot.backend.externalsourcejob.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateExternalSourceJobRequest(
        @NotBlank String name,
        @NotNull @Valid ExternalSourceQueryConfig queryConfig,
        List<@Valid ExternalSourceFilter> filterConfig,
        @NotBlank String scheduleCron
) {
}
