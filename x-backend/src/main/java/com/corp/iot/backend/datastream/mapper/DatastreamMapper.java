package com.corp.iot.backend.datastream.mapper;

import com.corp.iot.backend.datastream.dto.DatastreamResponse;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.metric.entity.Metric;
import org.springframework.stereotype.Component;

@Component
public class DatastreamMapper {

    // sourcePin: chỉ có giá trị khi datastream.sourceType = GATEWAY_PIN — denormalize
    // gatewayId/pinType/pinNumber/enabled để FE map RealtimeReadingMessage -> datastreamId
    // (xem API.md § Datastream) và hiện badge "Pin đã tắt" khi sourceEnabled=false.
    // metric: denormalize code + unit — FE cần unit thật (VD "°C") để hiện trên biểu đồ,
    // không phải metricCode (VD "temperature").
    public DatastreamResponse toResponse(Datastream datastream, Metric metric, GatewayPin sourcePin) {
        return new DatastreamResponse(
                datastream.getId(),
                datastream.getTenantNodeId(),
                datastream.getName(),
                datastream.getMetricId(),
                metric != null ? metric.getCode() : null,
                metric != null ? metric.getUnit() : null,
                datastream.getSourceType().name(),
                datastream.getSourceId(),
                sourcePin != null ? sourcePin.getGatewayId() : null,
                sourcePin != null ? sourcePin.getType().name() : null,
                sourcePin != null ? sourcePin.getPinNumber() : null,
                sourcePin != null ? sourcePin.isEnabled() : null
        );
    }
}
