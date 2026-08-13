package com.corp.iot.backend.command.dto;

import java.time.Instant;
import java.util.UUID;

public record CommandResponse(
        UUID id,
        Long gatewayId,
        Long pinId,
        String commandType,
        String status,
        Instant requestedAt,
        Instant timeoutAt,
        String error
) {
}
