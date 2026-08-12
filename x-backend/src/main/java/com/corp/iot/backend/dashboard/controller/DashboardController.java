package com.corp.iot.backend.dashboard.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboard.dto.UpdateDashboardRequest;
import com.corp.iot.backend.dashboard.service.DashboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenant-nodes/{nodeId}/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    // Board là customization cá nhân của user (mỗi user 1 board/node) nên cho cả VIEWER
    // sửa layout của chính mình — khác CRUD tổ chức (chỉ TENANT_ADMIN) ở TenantNodeController.
    @GetMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccess(#nodeId)")
    public ApiResponse<DashboardResponse> get(@PathVariable Long nodeId) {
        return ApiResponse.of(dashboardService.getOrCreate(nodeId));
    }

    @PutMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccess(#nodeId)")
    public ApiResponse<DashboardResponse> save(@PathVariable Long nodeId, @Valid @RequestBody UpdateDashboardRequest request) {
        return ApiResponse.of(dashboardService.save(nodeId, request));
    }
}
