package com.corp.iot.backend.platformuser.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.platformuser.dto.CreatePlatformUserRequest;
import com.corp.iot.backend.platformuser.dto.PlatformUserResponse;
import com.corp.iot.backend.platformuser.dto.UpdatePlatformUserStatusRequest;
import com.corp.iot.backend.platformuser.service.PlatformUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/platform-users")
@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")
@RequiredArgsConstructor
public class PlatformUserController {

    private final PlatformUserService platformUserService;

    @PostMapping
    public ApiResponse<PlatformUserResponse> create(@Valid @RequestBody CreatePlatformUserRequest request) {
        return ApiResponse.of(platformUserService.create(request));
    }

    @GetMapping
    public ApiResponse<List<PlatformUserResponse>> list() {
        return ApiResponse.of(platformUserService.list());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal AppUserPrincipal principal) {
        platformUserService.delete(id, principal.userId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/status")
    public ApiResponse<PlatformUserResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePlatformUserStatusRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal
    ) {
        return ApiResponse.of(platformUserService.updateStatus(id, request, principal.userId()));
    }
}
