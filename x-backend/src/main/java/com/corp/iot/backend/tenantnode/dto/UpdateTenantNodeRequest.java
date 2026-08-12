package com.corp.iot.backend.tenantnode.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateTenantNodeRequest(
        @NotBlank String name
) {
}
