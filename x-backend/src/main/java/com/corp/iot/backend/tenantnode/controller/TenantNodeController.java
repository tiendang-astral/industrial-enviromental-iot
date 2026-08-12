package com.corp.iot.backend.tenantnode.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.tenantnode.dto.CreateTenantNodeRequest;
import com.corp.iot.backend.tenantnode.dto.MoveTenantNodeRequest;
import com.corp.iot.backend.tenantnode.dto.TenantNodeResponse;
import com.corp.iot.backend.tenantnode.dto.UpdateTenantNodeRequest;
import com.corp.iot.backend.tenantnode.service.TenantNodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tenant-nodes")
@RequiredArgsConstructor
public class TenantNodeController {

    private final TenantNodeService tenantNodeService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER')")
    public ApiResponse<List<TenantNodeResponse>> list() {
        return ApiResponse.of(tenantNodeService.list());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('TENANT_ADMIN') and @nodeScope.canAccess(#request.parentId())")
    public ApiResponse<TenantNodeResponse> create(@Valid @RequestBody CreateTenantNodeRequest request) {
        return ApiResponse.of(tenantNodeService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('TENANT_ADMIN') and @nodeScope.canAccess(#id)")
    public ApiResponse<TenantNodeResponse> rename(@PathVariable Long id, @Valid @RequestBody UpdateTenantNodeRequest request) {
        return ApiResponse.of(tenantNodeService.rename(id, request));
    }

    @PutMapping("/{id}/move")
    @PreAuthorize("hasAuthority('TENANT_ADMIN') and @nodeScope.canAccess(#id) and @nodeScope.canAccess(#request.newParentId())")
    public ApiResponse<TenantNodeResponse> move(@PathVariable Long id, @Valid @RequestBody MoveTenantNodeRequest request) {
        return ApiResponse.of(tenantNodeService.move(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('TENANT_ADMIN') and @nodeScope.canAccess(#id)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        tenantNodeService.delete(id);
        return ResponseEntity.ok().build();
    }
}
