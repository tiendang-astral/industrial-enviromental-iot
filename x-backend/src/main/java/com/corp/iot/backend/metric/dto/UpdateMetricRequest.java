package com.corp.iot.backend.metric.dto;

import jakarta.validation.constraints.NotBlank;

/** Không có `code`: nó là tag InfluxDB, đổi sẽ tách series của cùng một kênh làm hai. */
public record UpdateMetricRequest(
        @NotBlank String name,
        @NotBlank String unit,
        @NotBlank String color
) {
}
