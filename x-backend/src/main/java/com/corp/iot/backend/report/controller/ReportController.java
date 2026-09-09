package com.corp.iot.backend.report.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.report.dto.ReportDtos.EnvironmentReportResponse;
import com.corp.iot.backend.report.dto.ReportDtos.IncidentReportResponse;
import com.corp.iot.backend.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

// VIEWER cũng đọc được: PRODUCT.md xếp "xem báo cáo" vào quyền Nhân viên. Phạm vi đơn vị do
// ReportService giao với scope user, không dùng @nodeScope (một báo cáo trải trên nhiều đơn vị).
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER')")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/environment")
    public ApiResponse<EnvironmentReportResponse> environment(
            @RequestParam Instant from,
            @RequestParam Instant to,
            @RequestParam(required = false) List<Long> tenantNodeIds,
            @RequestParam(required = false) List<Long> metricIds,
            @RequestParam(required = false) List<Long> gatewayIds,
            @RequestParam(required = false) List<Long> externalSourceIds
    ) {
        return ApiResponse.of(reportService.environment(from, to, tenantNodeIds, metricIds, gatewayIds, externalSourceIds));
    }

    @GetMapping("/incident")
    public ApiResponse<IncidentReportResponse> incident(
            @RequestParam Instant from,
            @RequestParam Instant to,
            @RequestParam(required = false) List<Long> tenantNodeIds,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) List<Long> gatewayIds,
            @RequestParam(required = false) List<Long> externalSourceIds,
            @RequestParam(required = false) List<Long> metricIds
    ) {
        return ApiResponse.of(
                reportService.incident(from, to, tenantNodeIds, severity, gatewayIds, externalSourceIds, metricIds));
    }
}
