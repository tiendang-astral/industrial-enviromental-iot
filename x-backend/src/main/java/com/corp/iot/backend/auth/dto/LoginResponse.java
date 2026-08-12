package com.corp.iot.backend.auth.dto;

public record LoginResponse(
        String accessToken,
        long expiresIn,
        MeResponse user
) {
}
