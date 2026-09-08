package com.corp.iot.processing.alert.notify;

import java.time.Instant;

/** Nội dung một cảnh báo cần gửi ra kênh ngoài — dựng sẵn ở luồng đánh giá, gửi ở thread khác. */
public record AlertNotification(
        Long alertRuleId,
        String ruleName,
        String severity,
        boolean recovered,
        String datastreamName,
        String metricName,
        String unit,
        Double value,
        Instant measuredAt
) {
}
