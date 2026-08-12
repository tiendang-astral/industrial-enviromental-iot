package com.corp.iot.backend.dashboardtemplate.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboardtemplate.dto.DashboardTemplateResponse;
import com.corp.iot.backend.dashboardtemplate.service.DashboardTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class DashboardTemplateController {

    private final DashboardTemplateService dashboardTemplateService;

    @GetMapping("/api/v1/dashboard-templates")
    public ApiResponse<List<DashboardTemplateResponse>> list() {
        return ApiResponse.of(dashboardTemplateService.list());
    }

    @PostMapping("/api/v1/tenant-nodes/{nodeId}/dashboard/apply-template/{templateId}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccess(#nodeId)")
    public ApiResponse<DashboardResponse> applyTemplate(@PathVariable Long nodeId, @PathVariable Long templateId) {
        return ApiResponse.of(dashboardTemplateService.applyToNode(nodeId, templateId));
    }
}
