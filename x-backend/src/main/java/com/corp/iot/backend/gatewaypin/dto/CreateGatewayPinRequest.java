package com.corp.iot.backend.gatewaypin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateGatewayPinRequest(
        @NotBlank String direction,
        @NotBlank String type,
        @NotBlank String name,
        Long metricId,
        @NotNull Integer pinNumber
) {
}
