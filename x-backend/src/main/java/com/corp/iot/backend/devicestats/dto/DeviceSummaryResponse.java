package com.corp.iot.backend.devicestats.dto;

import java.time.Instant;

public record DeviceSummaryResponse(Long id, String name, String macAddress, Instant lastSeenAt, boolean online) {
}
