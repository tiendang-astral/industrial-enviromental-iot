package com.corp.iot.backend.tenantnode.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateTenantNodeStatusRequest(
        @NotNull Boolean enabled
) {
}
