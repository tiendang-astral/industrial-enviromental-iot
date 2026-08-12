package com.corp.iot.backend.tenant.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTenantRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotBlank String adminUsername,
        @NotBlank String adminFullName,
        @Email String adminEmail,
        @NotBlank @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự") String adminPassword
) {
}
