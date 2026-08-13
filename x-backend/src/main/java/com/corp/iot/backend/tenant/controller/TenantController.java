package com.corp.iot.backend.tenant.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.tenant.dto.CreateTenantRequest;
import com.corp.iot.backend.tenant.dto.TenantDetailResponse;
import com.corp.iot.backend.tenant.dto.TenantResponse;
import com.corp.iot.backend.tenant.dto.UpdateTenantStatusRequest;
import com.corp.iot.backend.tenant.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tenants")
@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;

    @PostMapping
    public ApiResponse<TenantResponse> create(@Valid @RequestBody CreateTenantRequest request) {
        return ApiResponse.of(tenantService.create(request));
    }

    @GetMapping
    public ApiResponse<List<TenantResponse>> list() {
        return ApiResponse.of(tenantService.list());
    }

    @GetMapping("/{id}")
    public ApiResponse<TenantDetailResponse> detail(@PathVariable Long id) {
        return ApiResponse.of(tenantService.detail(id));
    }

    @PutMapping("/{id}/status")
    public ApiResponse<TenantResponse> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateTenantStatusRequest request) {
        return ApiResponse.of(tenantService.updateStatus(id, request));
    }
}
