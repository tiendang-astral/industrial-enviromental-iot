package com.corp.iot.backend.externalsourcejob.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

// Mapped trực tiếp vào cột external_source_job.query_config (jsonb). table/timestampColumn/
// valueColumns là identifier SQL — validate allowlist ở ExternalSourceJobServiceImpl (không
// parameterize được identifier trong JDBC, xem ARCHITECTURE.md § Flow: External source data).
public record ExternalSourceQueryConfig(
        @NotBlank String table,
        @NotBlank String timestampColumn,
        @NotEmpty List<String> valueColumns
) {
}
