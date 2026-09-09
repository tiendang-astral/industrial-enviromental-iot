package com.corp.iot.backend.common.influx;

/** Bộ tag định danh một kênh gateway trong measurement `sensor_reading` (xem DATABASE.md §4). */
public record SensorChannel(Long gatewayId, String pinType, Integer pinNumber) {
}
