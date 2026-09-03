package com.corp.iot.backend.tenantuser.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.tenantuser.dto.CreateTenantUserRequest;
import com.corp.iot.backend.tenantuser.dto.ResetTenantUserPasswordRequest;
import com.corp.iot.backend.tenantuser.dto.TenantUserResponse;
import com.corp.iot.backend.tenantuser.dto.UpdateTenantUserRequest;
import com.corp.iot.backend.tenantuser.dto.UpdateTenantUserStatusRequest;
import com.corp.iot.backend.tenantuser.service.TenantUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Quản lý người dùng TRONG tenant. Chỉ TENANT_ADMIN — quản lý tài khoản và phân quyền là việc của
 * quản trị viên tenant, MANAGER/OPERATOR/VIEWER không xem được danh sách (khác TenantNodeController
 * nơi các vai trò kia còn được đọc).
 *
 * Hibernate @TenantId trên TenantUser/UserRoleScope/TenantRole tự giới hạn mọi query trong tenant
 * của người gọi, nên ở đây không cần kiểm tra tenant bằng tay.
 */
@RestController
@RequestMapping("/api/v1/tenant-users")
@PreAuthorize("hasAuthority('TENANT_ADMIN')")
@RequiredArgsConstructor
public class TenantUserController {

    private final TenantUserService tenantUserService;

    @GetMapping
    public ApiResponse<List<TenantUserResponse>> list() {
        return ApiResponse.of(tenantUserService.list());
    }

    @PostMapping
    public ApiResponse<TenantUserResponse> create(@Valid @RequestBody CreateTenantUserRequest request) {
        return ApiResponse.of(tenantUserService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<TenantUserResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTenantUserRequest request
    ) {
        return ApiResponse.of(tenantUserService.update(id, request));
    }

    @PutMapping("/{id}/status")
    public ApiResponse<TenantUserResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTenantUserStatusRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal
    ) {
        return ApiResponse.of(tenantUserService.updateStatus(id, request, principal.userId()));
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<Void> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody ResetTenantUserPasswordRequest request
    ) {
        tenantUserService.resetPassword(id, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal AppUserPrincipal principal) {
        tenantUserService.delete(id, principal.userId());
        return ResponseEntity.ok().build();
    }
}
