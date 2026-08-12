package com.corp.iot.backend.platformuser.dto;

import java.time.Instant;

public record PlatformUserResponse(
        Long id,
        String username,
        String fullName,
        String email,
        String status,
        Instant createdAt
) {
}
