package com.corp.iot.backend.tenant.dto;

import jakarta.validation.constraints.Pattern;

public record UpdateTenantStatusRequest(
        @Pattern(regexp = "ACTIVE|LOCKED", message = "status phải là ACTIVE hoặc LOCKED") String status
) {
}
