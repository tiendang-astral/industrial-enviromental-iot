package com.corp.iot.backend.common.influx;

import java.time.Instant;

public record ReadingPoint(Double value, Instant measuredAt) {
}
