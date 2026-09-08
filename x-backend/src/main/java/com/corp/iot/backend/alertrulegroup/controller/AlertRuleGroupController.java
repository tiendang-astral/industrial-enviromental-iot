package com.corp.iot.backend.alertrulegroup.controller;

import com.corp.iot.backend.alertrule.dto.UpdateAlertRuleStatusRequest;
import com.corp.iot.backend.alertrulegroup.dto.AlertRuleGroupDtos.AlertRuleGroupResponse;
import com.corp.iot.backend.alertrulegroup.dto.AlertRuleGroupDtos.SaveAlertRuleGroupRequest;
import com.corp.iot.backend.alertrulegroup.service.AlertRuleGroupService;
import com.corp.iot.backend.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Đường ghi chính của UI: một nhóm = một lần cấu hình của người dùng, backend trải phẳng thành
 * N×M {@code alert_rule}. Kiểm tra phạm vi từng đơn vị nằm trong service (một nhóm có nhiều đơn vị
 * nên không dùng được `@nodeScope` vốn nhận đúng một id).
 */
@RestController
@RequiredArgsConstructor
public class AlertRuleGroupController {

    private final AlertRuleGroupService alertRuleGroupService;

    @GetMapping("/api/v1/alert-rule-groups")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER')")
    public ApiResponse<List<AlertRuleGroupResponse>> list() {
        return ApiResponse.of(alertRuleGroupService.list());
    }

    @PostMapping("/api/v1/alert-rule-groups")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR')")
    public ApiResponse<AlertRuleGroupResponse> create(@Valid @RequestBody SaveAlertRuleGroupRequest request) {
        return ApiResponse.of(alertRuleGroupService.create(request));
    }

    @PutMapping("/api/v1/alert-rule-groups/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR')")
    public ApiResponse<AlertRuleGroupResponse> update(
            @PathVariable Long id, @Valid @RequestBody SaveAlertRuleGroupRequest request) {
        return ApiResponse.of(alertRuleGroupService.update(id, request));
    }

    @PutMapping("/api/v1/alert-rule-groups/{id}/status")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR')")
    public ApiResponse<AlertRuleGroupResponse> updateStatus(
            @PathVariable Long id, @Valid @RequestBody UpdateAlertRuleStatusRequest request) {
        return ApiResponse.of(alertRuleGroupService.updateStatus(id, request.enabled()));
    }

    @DeleteMapping("/api/v1/alert-rule-groups/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        alertRuleGroupService.delete(id);
        return ResponseEntity.ok().build();
    }
}
