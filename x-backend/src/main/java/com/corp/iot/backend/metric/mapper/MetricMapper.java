package com.corp.iot.backend.metric.mapper;

import com.corp.iot.backend.metric.dto.MetricResponse;
import com.corp.iot.backend.metric.entity.Metric;
import org.springframework.stereotype.Component;

@Component
public class MetricMapper {

    public MetricResponse toResponse(Metric metric) {
        return new MetricResponse(
                metric.getId(),
                metric.getCode(),
                metric.getName(),
                metric.getUnit(),
                metric.getDataType(),
                metric.getMinValue(),
                metric.getMaxValue()
        );
    }
}
