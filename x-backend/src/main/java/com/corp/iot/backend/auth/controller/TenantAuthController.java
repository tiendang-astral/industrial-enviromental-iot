package com.corp.iot.backend.auth.controller;

import com.corp.iot.backend.auth.dto.LoginRequest;
import com.corp.iot.backend.auth.dto.LoginResponse;
import com.corp.iot.backend.auth.service.AuthService;
import com.corp.iot.backend.auth.service.LoginResult;
import com.corp.iot.backend.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Arrays;

/**
 * Login/refresh/logout riêng cho x-frontend (tenant_user). Path
 * `/api/v1/tenant/auth` khác hẳn PlatformAuthController để cookie
 * `refresh_token` (scope theo Path, không phân biệt port) không đụng độ khi
 * mở cả x-frontend và x-frontend-admin trong cùng trình duyệt lúc dev local.
 */
@RestController
@RequestMapping("/api/v1/tenant/auth")
@RequiredArgsConstructor
public class TenantAuthController {

    private static final String COOKIE_NAME = "refresh_token";
    private static final String COOKIE_PATH = "/api/v1/tenant/auth";

    private final AuthService authService;

    @Value("${app.refresh-token.ttl-days}")
    private long refreshTokenTtlDays;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResult result = authService.loginTenant(request.username(), request.password());
        return withRefreshCookie(result);
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(HttpServletRequest request) {
        String rawRefreshToken = readCookie(request);
        LoginResult result = authService.refresh(rawRefreshToken);
        return withRefreshCookie(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        String rawRefreshToken = readCookie(request);
        if (rawRefreshToken != null) {
            authService.logout(rawRefreshToken);
        }
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .path(COOKIE_PATH)
                .maxAge(0)
                .sameSite("Lax")
                .build();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).build();
    }

    private ResponseEntity<ApiResponse<LoginResponse>> withRefreshCookie(LoginResult result) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, result.rawRefreshToken())
                .httpOnly(true)
                .path(COOKIE_PATH)
                .maxAge(Duration.ofDays(refreshTokenTtlDays))
                .sameSite("Lax")
                .build();
        LoginResponse body = new LoginResponse(result.accessToken(), result.expiresIn(), result.user());
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).body(ApiResponse.of(body));
    }

    private String readCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        return Arrays.stream(request.getCookies())
                .filter(cookie -> COOKIE_NAME.equals(cookie.getName()))
                .map(jakarta.servlet.http.Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
