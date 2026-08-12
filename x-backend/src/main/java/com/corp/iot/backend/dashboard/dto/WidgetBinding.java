package com.corp.iot.backend.dashboard.dto;

// null cho widget tổng hợp theo node (DEVICE_COUNT/DEVICES_ONLINE) — chỉ VALUE/LINE bind datastream.
public record WidgetBinding(Long datastreamId) {
}
