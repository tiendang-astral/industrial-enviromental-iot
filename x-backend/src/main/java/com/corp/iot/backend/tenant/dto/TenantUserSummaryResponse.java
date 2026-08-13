package com.corp.iot.backend.tenant.dto;

public record TenantUserSummaryResponse(
        Long id,
        String username,
        String fullName,
        String email,
        String status
) {
}
