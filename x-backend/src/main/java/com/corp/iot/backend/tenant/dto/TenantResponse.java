package com.corp.iot.backend.tenant.dto;

import java.time.Instant;

public record TenantResponse(
        Long id,
        String name,
        String email,
        String status,
        Instant createdAt
) {
}
