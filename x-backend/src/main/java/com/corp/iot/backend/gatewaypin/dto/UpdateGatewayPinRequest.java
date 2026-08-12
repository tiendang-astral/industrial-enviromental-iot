package com.corp.iot.backend.gatewaypin.dto;

public record UpdateGatewayPinRequest(
        String name,
        Boolean enabled
) {
}
