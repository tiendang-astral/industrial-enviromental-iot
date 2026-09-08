package com.corp.iot.backend.alert.controller;

import com.corp.iot.backend.alert.dto.AlertResponse;
import com.corp.iot.backend.alert.service.AlertService;
import com.corp.iot.backend.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    // Lọc theo scope nằm trong service (giao của scope user với subtree node), không dùng
    // @nodeScope ở đây vì tenantNodeId là optional — không truyền = mọi alert trong scope.
    @GetMapping("/api/v1/alerts")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER')")
    public ApiResponse<List<AlertResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long tenantNodeId,
            @RequestParam(defaultValue = "500") int limit) {
        return ApiResponse.of(alertService.list(status, tenantNodeId, limit));
    }
}
