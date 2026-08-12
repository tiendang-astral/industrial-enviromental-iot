package com.corp.iot.backend.telemetry.dto;

import java.time.Instant;
import java.util.List;

public record PinTelemetryResponse(
        Long pinId,
        Integer pinNumber,
        String type,
        String name,
        String metricCode,
        String unit,
        Double latestValue,
        Instant latestMeasuredAt,
        List<ReadingPointDto> history
) {
}
