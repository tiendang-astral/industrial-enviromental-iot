package com.corp.iot.backend.externalsource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// Mapped trực tiếp vào cột external_source.connection_config (jsonb) — xem entity ExternalSource.
public record ExternalSourceConnectionConfig(
        @NotBlank String host,
        @NotNull Integer port,
        @NotBlank String database,
        String sslMode
) {
}
