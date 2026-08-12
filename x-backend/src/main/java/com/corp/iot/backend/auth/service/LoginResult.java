package com.corp.iot.backend.auth.service;

import com.corp.iot.backend.auth.dto.MeResponse;

public record LoginResult(
        String accessToken,
        long expiresIn,
        String rawRefreshToken,
        MeResponse user
) {
}
