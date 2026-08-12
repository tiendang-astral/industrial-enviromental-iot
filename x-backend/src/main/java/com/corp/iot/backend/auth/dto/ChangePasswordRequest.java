package com.corp.iot.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 6, message = "Mật khẩu mới phải có ít nhất 6 ký tự") String newPassword
) {
}
