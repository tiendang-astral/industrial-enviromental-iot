package com.corp.iot.backend.gateway.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateGatewayRequest(
        @NotBlank String name
) {
}
