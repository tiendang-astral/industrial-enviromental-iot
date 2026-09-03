package com.corp.iot.backend.platformdashboard.dto;

public record TenantStatsResponse(
        Long tenantId,
        String tenantName,
        long userCount,
        long deviceCount,
        long dataSourceCount
) {
}
