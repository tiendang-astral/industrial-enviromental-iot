package com.corp.iot.backend.auth.dto;

import java.util.List;

public record MeResponse(
        Long id,
        String username,
        String fullName,
        String email,
        String type,
        Long tenantId,
        List<String> authorities
) {
}
