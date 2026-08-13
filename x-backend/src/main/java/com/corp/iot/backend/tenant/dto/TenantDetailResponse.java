package com.corp.iot.backend.tenant.dto;

import com.corp.iot.backend.gateway.dto.GatewayResponse;
import com.corp.iot.backend.tenantnode.dto.TenantNodeResponse;

import java.util.List;

public record TenantDetailResponse(
        TenantResponse tenant,
        List<TenantNodeResponse> nodes,
        List<GatewayResponse> gateways,
        List<TenantUserSummaryResponse> users
) {
}
