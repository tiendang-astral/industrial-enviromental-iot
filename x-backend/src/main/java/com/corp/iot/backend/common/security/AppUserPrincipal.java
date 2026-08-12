package com.corp.iot.backend.common.security;

import java.util.List;

public record AppUserPrincipal(
        Long userId,
        Long tenantId,
        String username,
        UserType type,
        List<String> authorities
) {
}
