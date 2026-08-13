package com.corp.iot.backend.externalsource.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

// connectionConfig/credential bỏ trống (null) = giữ nguyên, giống UpdateGatewayRequest.macAddress.
public record UpdateExternalSourceRequest(
        @NotBlank String name,
        @Valid ExternalSourceConnectionConfig connectionConfig,
        @Valid ExternalSourceCredential credential
) {
}
