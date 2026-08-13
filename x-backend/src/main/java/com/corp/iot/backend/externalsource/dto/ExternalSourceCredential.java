package com.corp.iot.backend.externalsource.dto;

import jakarta.validation.constraints.NotBlank;

// Chỉ dùng ở request — không lưu trực tiếp, encrypt (CredentialEncryptionService) thành JSON
// rồi ghi vào external_source.credential_encrypted, không bao giờ trả lại qua response.
public record ExternalSourceCredential(
        @NotBlank String username,
        @NotBlank String password
) {
}
