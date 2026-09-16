package com.corp.iot.backend.metric.mapper;

import com.corp.iot.backend.metric.dto.MetricResponse;
import com.corp.iot.backend.metric.service.EffectiveMetric;
import org.springframework.stereotype.Component;

@Component
public class MetricMapper {

    // Nhận EffectiveMetric chứ không phải entity Metric: ngưỡng chỉ có nghĩa sau khi đã áp
    // tenant_metric_setting của người gọi (xem MetricResolver).
    public MetricResponse toResponse(EffectiveMetric metric) {
        return new MetricResponse(
                metric.id(),
                metric.code(),
                metric.name(),
                metric.unit(),
                metric.dataType(),
                metric.color(),
                metric.minValue(),
                metric.maxValue(),
                metric.custom(),
                metric.thresholdOverridden()
        );
    }
}
