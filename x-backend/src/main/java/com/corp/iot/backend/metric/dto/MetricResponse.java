package com.corp.iot.backend.metric.dto;

/**
 * `minValue`/`maxValue` là ngưỡng ĐÃ áp theo tenant đang gọi — NULL nghĩa là tenant chưa đặt, và
 * frontend sẽ không tô màu trạng thái (getMetricThreshold trả "ok").
 */
public record MetricResponse(
        Long id,
        String code,
        String name,
        String unit,
        String dataType,
        // Token màu — chỉ có ở chỉ số riêng; chỉ số hệ thống để NULL và FE tự tra theo `code`.
        String color,
        Double minValue,
        Double maxValue,
        // true = chỉ số do tenant tự thêm (sửa/xoá được)
        boolean custom,
        // true = tenant đã đặt ngưỡng riêng, khôi phục mặc định được
        boolean thresholdOverridden
) {
}
