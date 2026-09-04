package com.corp.iot.backend.gateway.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.gateway.dto.CreateGatewayRequest;
import com.corp.iot.backend.gateway.dto.GatewayResponse;
import com.corp.iot.backend.gateway.dto.UpdateGatewayRequest;
import com.corp.iot.backend.gateway.service.GatewayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/gateways")
@RequiredArgsConstructor
public class GatewayController {

    private final GatewayService gatewayService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and (#tenantNodeId == null or @nodeScope.canAccess(#tenantNodeId))")
    public ApiResponse<List<GatewayResponse>> list(
            @RequestParam(required = false) Long tenantNodeId,
            @RequestParam(defaultValue = "false") boolean includeDescendants) {
        return ApiResponse.of(gatewayService.list(tenantNodeId, includeDescendants));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccess(#request.tenantNodeId())")
    public ApiResponse<GatewayResponse> create(@Valid @RequestBody CreateGatewayRequest request) {
        return ApiResponse.of(gatewayService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR')")
    public ApiResponse<GatewayResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateGatewayRequest request) {
        return ApiResponse.of(gatewayService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        gatewayService.delete(id);
        return ResponseEntity.ok().build();
    }
}
