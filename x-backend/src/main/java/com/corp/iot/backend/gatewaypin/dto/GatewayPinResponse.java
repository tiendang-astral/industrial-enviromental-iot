package com.corp.iot.backend.gatewaypin.dto;

public record GatewayPinResponse(
        Long id,
        Long gatewayId,
        String direction,
        String type,
        String name,
        Long metricId,
        Integer pinNumber,
        String powerDesiredState,
        String powerReportedState,
        boolean enabled
) {
}
