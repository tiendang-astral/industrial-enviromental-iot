package com.corp.iot.backend.gateway.dto;

import java.time.Instant;

public record GatewayResponse(
        Long id,
        Long tenantNodeId,
        String name,
        String macAddress,
        Instant lastSeenAt
) {
}
