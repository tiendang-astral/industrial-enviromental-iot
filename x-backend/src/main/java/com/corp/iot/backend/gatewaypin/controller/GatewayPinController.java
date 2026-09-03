package com.corp.iot.backend.gatewaypin.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.gatewaypin.dto.CreateGatewayPinRequest;
import com.corp.iot.backend.gatewaypin.dto.GatewayPinResponse;
import com.corp.iot.backend.gatewaypin.dto.UpdateGatewayPinRequest;
import com.corp.iot.backend.gatewaypin.service.GatewayPinService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/gateways/{gatewayId}/pins")
@RequiredArgsConstructor
public class GatewayPinController {

    private final GatewayPinService gatewayPinService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccessGateway(#gatewayId)")
    public ApiResponse<List<GatewayPinResponse>> list(@PathVariable Long gatewayId) {
        return ApiResponse.of(gatewayPinService.list(gatewayId));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessGateway(#gatewayId)")
    public ApiResponse<GatewayPinResponse> create(@PathVariable Long gatewayId, @Valid @RequestBody CreateGatewayPinRequest request) {
        return ApiResponse.of(gatewayPinService.create(gatewayId, request));
    }

    @PutMapping("/{pinId}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessGateway(#gatewayId)")
    public ApiResponse<GatewayPinResponse> update(
            @PathVariable Long gatewayId,
            @PathVariable Long pinId,
            @Valid @RequestBody UpdateGatewayPinRequest request
    ) {
        return ApiResponse.of(gatewayPinService.update(gatewayId, pinId, request));
    }

    @DeleteMapping("/{pinId}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessGateway(#gatewayId)")
    public ResponseEntity<Void> delete(@PathVariable Long gatewayId, @PathVariable Long pinId) {
        gatewayPinService.delete(gatewayId, pinId);
        return ResponseEntity.ok().build();
    }
}
