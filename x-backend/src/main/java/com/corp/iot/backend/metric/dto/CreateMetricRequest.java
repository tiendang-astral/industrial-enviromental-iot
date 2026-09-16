package com.corp.iot.backend.metric.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateMetricRequest(
        // Tag InfluxDB nên chỉ nhận chữ thường/số/gạch dưới và không sửa được về sau.
        @NotBlank @Pattern(regexp = "^[a-z][a-z0-9_]{0,63}$") String code,
        @NotBlank String name,
        @NotBlank String unit,
        @NotBlank String color,
        Double minValue,
        Double maxValue
) {
}
