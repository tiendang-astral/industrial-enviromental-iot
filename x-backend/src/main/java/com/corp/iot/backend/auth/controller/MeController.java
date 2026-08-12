package com.corp.iot.backend.auth.controller;

import com.corp.iot.backend.auth.dto.MeResponse;
import com.corp.iot.backend.auth.service.AuthService;
import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class MeController {

    private final AuthService authService;

    @GetMapping
    public ApiResponse<MeResponse> me(@AuthenticationPrincipal AppUserPrincipal principal) {
        return ApiResponse.of(authService.me(principal));
    }
}
