package com.corp.iot.backend.tenantuser.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/** `scopes` là REPLACE toàn bộ, không phải merge — cùng quy ước với `alert_channel` của alert_rule. */
public record UpdateTenantUserRequest(
        @NotBlank String fullName,
        @Email String email,
        @NotEmpty(message = "Phải gán ít nhất một vai trò") @Valid List<UserScopeRequest> scopes
) {
}
