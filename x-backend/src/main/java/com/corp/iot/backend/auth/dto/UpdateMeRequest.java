package com.corp.iot.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Người dùng tự sửa hồ sơ của chính mình. Không cho đổi `username` (định danh đăng nhập, unique
 * toàn cục, đã nằm trong JWT đang phát hành) và không cho đổi role/scope — hai thứ đó thuộc quyền
 * quản trị viên, sửa ở màn hình quản lý người dùng.
 */
public record UpdateMeRequest(
        @NotBlank @Size(max = 255) String fullName,
        @Email(message = "Email không hợp lệ") @Size(max = 255) String email
) {
}
