package com.corp.iot.backend.metric.dto;

import jakarta.validation.constraints.NotNull;

/** Cả hai bắt buộc — một đầu ngưỡng thì getMetricThreshold() không đánh giá được gì. */
public record UpdateMetricThresholdRequest(
        @NotNull Double minValue,
        @NotNull Double maxValue
) {
}
