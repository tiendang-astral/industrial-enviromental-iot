package com.corp.iot.backend.tenantuser.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateTenantUserRequest(
        @NotBlank String username,
        @NotBlank String fullName,
        @Email String email,
        @NotBlank @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự") String password,
        /* Bắt buộc ít nhất 1 phân quyền: user không có role nào thì đăng nhập được nhưng không
           thấy gì, tạo ra tài khoản "chết" mà quản trị viên tưởng đã cấp quyền. */
        @NotEmpty(message = "Phải gán ít nhất một vai trò") @Valid List<UserScopeRequest> scopes
) {
}
