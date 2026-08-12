package com.corp.iot.backend.auth.controller;

import com.corp.iot.backend.auth.dto.ChangePasswordRequest;
import com.corp.iot.backend.auth.service.AuthService;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Đổi mật khẩu — dùng chung cho platform_user/tenant_user (điều khiển bởi
 * Bearer JWT, không phụ thuộc cookie nên không cần tách theo app như
 * PlatformAuthController/TenantAuthController).
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal AppUserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changePassword(principal, request);
        return ResponseEntity.ok().build();
    }
}
