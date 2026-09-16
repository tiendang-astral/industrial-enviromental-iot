package com.corp.iot.backend.metric.service;

/**
 * Chỉ số kèm ngưỡng đã áp theo tenant đang gọi.
 *
 * Là record chứ không phải entity {@code Metric} có sẵn: gán ngưỡng lên entity đang managed thì
 * Hibernate dirty-check sẽ flush và ghi đè bảng {@code metric} dùng chung cho mọi tenant — không ai
 * gọi save() mà dữ liệu vẫn hỏng, lại hỏng từ một endpoint chỉ đọc.
 */
public record EffectiveMetric(
        Long id,
        String code,
        String name,
        String unit,
        String dataType,
        String color,
        Double minValue,
        Double maxValue,
        boolean custom,
        boolean thresholdOverridden
) {
}
