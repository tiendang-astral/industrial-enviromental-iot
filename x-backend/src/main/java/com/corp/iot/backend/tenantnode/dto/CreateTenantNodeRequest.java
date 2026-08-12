package com.corp.iot.backend.tenantnode.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateTenantNodeRequest(
        @NotNull Long parentId,
        @NotBlank String nodeType,
        @NotBlank String name
) {
}
