package com.corp.iot.backend.tenantuser.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateTenantUserStatusRequest(
        @NotBlank String status
) {
}
