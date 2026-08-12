package com.corp.iot.backend.telemetry.dto;

import java.time.Instant;

public record ReadingPointDto(Double value, Instant measuredAt) {
}
