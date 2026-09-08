package com.corp.iot.backend.alertrule.controller;

import com.corp.iot.backend.alertrule.dto.AlertRuleResponse;
import com.corp.iot.backend.alertrule.dto.CreateAlertRuleRequest;
import com.corp.iot.backend.alertrule.dto.UpdateAlertRuleRequest;
import com.corp.iot.backend.alertrule.dto.UpdateAlertRuleStatusRequest;
import com.corp.iot.backend.alertrule.service.AlertRuleService;
import com.corp.iot.backend.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AlertRuleController {

    private final AlertRuleService alertRuleService;

    @GetMapping("/api/v1/alert-rules")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER')")
    public ApiResponse<List<AlertRuleResponse>> list(
            @RequestParam(required = false) Long tenantNodeId,
            @RequestParam(defaultValue = "false") boolean includeDescendants) {
        return ApiResponse.of(alertRuleService.list(tenantNodeId, includeDescendants));
    }

    @PostMapping("/api/v1/alert-rules")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccess(#request.tenantNodeId())")
    public ApiResponse<AlertRuleResponse> create(@Valid @RequestBody CreateAlertRuleRequest request) {
        return ApiResponse.of(alertRuleService.create(request));
    }

    @PutMapping("/api/v1/alert-rules/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessAlertRule(#id)")
    public ApiResponse<AlertRuleResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateAlertRuleRequest request) {
        return ApiResponse.of(alertRuleService.update(id, request));
    }

    @PutMapping("/api/v1/alert-rules/{id}/status")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessAlertRule(#id)")
    public ApiResponse<AlertRuleResponse> updateStatus(
            @PathVariable Long id, @Valid @RequestBody UpdateAlertRuleStatusRequest request) {
        return ApiResponse.of(alertRuleService.updateStatus(id, request.enabled()));
    }

    @DeleteMapping("/api/v1/alert-rules/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessAlertRule(#id)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        alertRuleService.delete(id);
        return ResponseEntity.ok().build();
    }
}
