package com.corp.iot.backend.role.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.role.dto.TenantRoleResponse;
import com.corp.iot.backend.role.service.TenantRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 4 vai trò mặc định được seed riêng cho từng tenant lúc tạo tenant (TenantServiceImpl), nên đây
 * là master data theo tenant chứ không phải global như `metric` — @TenantId lo phần lọc.
 */
@RestController
@RequestMapping("/api/v1/tenant-roles")
@PreAuthorize("hasAuthority('TENANT_ADMIN')")
@RequiredArgsConstructor
public class TenantRoleController {

    private final TenantRoleService tenantRoleService;

    @GetMapping
    public ApiResponse<List<TenantRoleResponse>> list() {
        return ApiResponse.of(tenantRoleService.list());
    }
}
