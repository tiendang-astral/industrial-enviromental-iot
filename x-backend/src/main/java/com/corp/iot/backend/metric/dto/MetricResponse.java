package com.corp.iot.backend.metric.dto;

public record MetricResponse(
        Long id,
        String code,
        String name,
        String unit,
        String dataType,
        Double minValue,
        Double maxValue
) {
}
