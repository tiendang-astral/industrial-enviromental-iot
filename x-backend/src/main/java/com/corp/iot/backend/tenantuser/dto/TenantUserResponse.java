package com.corp.iot.backend.tenantuser.dto;

import java.time.Instant;
import java.util.List;

public record TenantUserResponse(
        Long id,
        String username,
        String fullName,
        String email,
        String status,
        Instant createdAt,
        List<UserScopeResponse> scopes
) {
}
