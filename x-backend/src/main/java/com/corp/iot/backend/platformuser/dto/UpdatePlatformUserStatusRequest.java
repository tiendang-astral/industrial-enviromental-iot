package com.corp.iot.backend.platformuser.dto;

import jakarta.validation.constraints.Pattern;

public record UpdatePlatformUserStatusRequest(
        @Pattern(regexp = "ACTIVE|LOCKED", message = "status phải là ACTIVE hoặc LOCKED") String status
) {
}
