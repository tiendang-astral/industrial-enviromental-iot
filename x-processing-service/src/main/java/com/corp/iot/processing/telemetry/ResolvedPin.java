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

    /**
     * {@code gatewayId} truyền từ ngoài vào chứ không nằm trong record: bản ghi này được cache theo
     * khoá (gateway, loại chân, số chân) nên gateway đã có sẵn ở nơi gọi, nhét thêm vào giá trị
     * cache chỉ làm mọi bản ghi cũ hỏng mà không được gì.
     */
    public ChannelRef toChannelRef(Long gatewayId) {
        return new ChannelRef(datastreamId, datastreamName, metricId, SourceType.GATEWAY_PIN, gatewayId);
    }
}
