package com.corp.iot.backend.datastream.mapper;

import com.corp.iot.backend.common.influx.ReadingPoint;
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
        return toResponse(datastream, metric, sourcePin, null);
    }

    // latest: chỉ populate ở trang chi tiết External Source (đọc InfluxDB external_reading) —
    // xem DatastreamServiceImpl.listByExternalSource.
    public DatastreamResponse toResponse(Datastream datastream, Metric metric, GatewayPin sourcePin, ReadingPoint latest) {
        return new DatastreamResponse(
                datastream.getId(),
                datastream.getTenantNodeId(),
                datastream.getName(),
                datastream.getMetricId(),
                metric != null ? metric.getCode() : null,
                metric != null ? metric.getUnit() : null,
                datastream.getSourceType().name(),
                datastream.getSourceId(),
                datastream.getSourceField(),
                sourcePin != null ? sourcePin.getGatewayId() : null,
                sourcePin != null ? sourcePin.getType().name() : null,
                sourcePin != null ? sourcePin.getPinNumber() : null,
                sourcePin != null ? sourcePin.isEnabled() : null,
                latest != null ? latest.value() : null,
                latest != null ? latest.measuredAt() : null,
                datastream.getOldestReadingAt()
        );
    }
}
