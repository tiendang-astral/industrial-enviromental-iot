package com.corp.iot.backend.gateway.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateGatewayRequest(
        @NotNull Long tenantNodeId,
        @NotBlank String name,
        @NotBlank String macAddress
) {
}
