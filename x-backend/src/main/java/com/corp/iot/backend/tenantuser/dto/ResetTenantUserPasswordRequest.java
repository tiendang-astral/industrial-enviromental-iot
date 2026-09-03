package com.corp.iot.backend.tenantuser.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetTenantUserPasswordRequest(
        @NotBlank @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự") String newPassword
) {
}
