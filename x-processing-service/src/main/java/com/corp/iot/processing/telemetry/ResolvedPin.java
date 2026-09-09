package com.corp.iot.processing.telemetry;

import com.corp.iot.processing.alert.ChannelRef;
import com.corp.iot.processing.entity.SourceType;

/**
 * Kết quả gộp của 3 query từng chạy cho MỖI số đo: gateway_pin -> metric -> datastream.
 * Nằm gọn trong 1 giá trị cache Redis (xem {@link PinResolverService}).
 *
 * {@code datastreamId} có thể null: pin còn nhưng kênh dữ liệu của nó đã bị xoá — vẫn ghi InfluxDB
 * bình thường, chỉ không có gì để đánh giá cảnh báo.
 */
public record ResolvedPin(
        Long pinId,
        String metricCode,
        Long metricId,
        boolean enabled,
        Long datastreamId,
        String datastreamName) {

    public boolean hasChannel() {
        return datastreamId != null;
    }

    public ChannelRef toChannelRef() {
        return new ChannelRef(datastreamId, datastreamName, metricId, SourceType.GATEWAY_PIN);
    }
}
