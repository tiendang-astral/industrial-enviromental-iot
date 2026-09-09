package com.corp.iot.backend.common.influx;

/** Bộ tag định danh một kênh external trong measurement `external_reading` (xem DATABASE.md §4). */
public record ExternalChannel(Long jobId, String sourceField) {
}
