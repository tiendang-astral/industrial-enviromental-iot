package com.corp.iot.backend.datastream.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// Chỉ dùng để tạo datastream thủ công cho external_source_job (khác gateway_pin tự động) —
// xem DATABASE.md § datastream.
public record CreateDatastreamRequest(
        @NotBlank String name,
        @NotNull Long metricId,
        @NotBlank String sourceField
) {
}
