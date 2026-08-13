package com.corp.iot.backend.externalsource.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateExternalSourceRequest(
        @NotBlank String name,
        @NotBlank String connectionType,
        @NotNull @Valid ExternalSourceConnectionConfig connectionConfig,
        @NotNull @Valid ExternalSourceCredential credential
) {
}
