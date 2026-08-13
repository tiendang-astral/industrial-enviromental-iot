package com.corp.iot.backend.command.controller;

import com.corp.iot.backend.command.dto.CommandResponse;
import com.corp.iot.backend.command.dto.CreateCommandRequest;
import com.corp.iot.backend.command.service.CommandService;
import com.corp.iot.backend.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/gateways/{gatewayId}/pins/{pinId}/commands")
@RequiredArgsConstructor
public class CommandController {

    private final CommandService commandService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessGateway(#gatewayId)")
    public ApiResponse<CommandResponse> create(
            @PathVariable Long gatewayId,
            @PathVariable Long pinId,
            @Valid @RequestBody CreateCommandRequest request
    ) {
        return ApiResponse.of(commandService.create(gatewayId, pinId, request));
    }
}
