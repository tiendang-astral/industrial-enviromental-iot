package com.corp.iot.backend.externalsource.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.externalsource.dto.CreateExternalSourceRequest;
import com.corp.iot.backend.externalsource.dto.ExternalSourceResponse;
import com.corp.iot.backend.externalsource.dto.UpdateExternalSourceRequest;
import com.corp.iot.backend.externalsource.service.ExternalSourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Scope theo node như GatewayController — khác Gateway, tenantNodeId có thể là bất kỳ cấp
// (xem DATABASE.md § external_source). Quyền write TENANT_ADMIN/MANAGER/OPERATOR (Kỹ thuật
// viên cấu hình datasource — PRODUCT.md), VIEWER chỉ đọc.
@RestController
@RequiredArgsConstructor
public class ExternalSourceController {

    private final ExternalSourceService externalSourceService;

    @GetMapping("/api/v1/external-sources")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER')")
    public ApiResponse<List<ExternalSourceResponse>> listAll() {
        return ApiResponse.of(externalSourceService.listAll());
    }

    @GetMapping("/api/v1/tenant-nodes/{nodeId}/external-sources")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccess(#nodeId)")
    public ApiResponse<List<ExternalSourceResponse>> list(@PathVariable Long nodeId) {
        return ApiResponse.of(externalSourceService.list(nodeId));
    }

    @PostMapping("/api/v1/tenant-nodes/{nodeId}/external-sources")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccess(#nodeId)")
    public ApiResponse<ExternalSourceResponse> create(@PathVariable Long nodeId, @Valid @RequestBody CreateExternalSourceRequest request) {
        return ApiResponse.of(externalSourceService.create(nodeId, request));
    }

    @PutMapping("/api/v1/external-sources/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessSource(#id)")
    public ApiResponse<ExternalSourceResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateExternalSourceRequest request) {
        return ApiResponse.of(externalSourceService.update(id, request));
    }

    @DeleteMapping("/api/v1/external-sources/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessSource(#id)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        externalSourceService.delete(id);
        return ResponseEntity.ok().build();
    }
}
