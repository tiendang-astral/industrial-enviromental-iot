package com.corp.iot.backend.externalsourcejob.dto;

import jakarta.validation.constraints.NotBlank;

public record ExternalSourceFilter(
        @NotBlank String column,
        @NotBlank String operator,
        @NotBlank String value
) {
}
