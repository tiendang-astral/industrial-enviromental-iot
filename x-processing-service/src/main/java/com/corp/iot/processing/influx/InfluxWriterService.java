package com.corp.iot.processing.influx;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;

// Ghi InfluxDB measurement sensor_reading (xem DATABASE.md §4) — bucket raw,
// downsample raw->1m->5m->1h->1d để Phase 9 (chưa cần ở Phase 3).
@Service
@RequiredArgsConstructor
public class InfluxWriterService {

    private final InfluxDBClient influxDBClient;

    @Value("${influx.org}")
    private String org;

    @Value("${influx.bucket}")
    private String bucket;

    public void writeSensorReading(
            Long tenantId, Long tenantNodeId, Long gatewayId, String metricCode,
            String pinType, Integer pinNumber, Double value, Instant measuredAt) {
        Point point = Point.measurement("sensor_reading")
                .addTag("tenant_id", String.valueOf(tenantId))
                .addTag("tenant_node_id", String.valueOf(tenantNodeId))
                .addTag("gateway_id", String.valueOf(gatewayId))
                .addTag("metric", metricCode)
                .addTag("pin_type", pinType)
                .addTag("pin_number", String.valueOf(pinNumber))
                .addField("value_float", value)
                .addField("quality", "GOOD")
                .time(measuredAt, WritePrecision.NS);
        influxDBClient.getWriteApiBlocking().writePoint(bucket, org, point);
    }

    // Ghi InfluxDB measurement external_reading (xem DATABASE.md §4) — luồng External source
    // polling (Phase 5, ARCHITECTURE.md § Flow: External source data). source_id = externalSourceJobId.
    public void writeExternalReading(
            Long tenantId, Long tenantNodeId, Long externalSourceJobId, String metricCode, Double value, Instant measuredAt) {
        Point point = Point.measurement("external_reading")
                .addTag("tenant_id", String.valueOf(tenantId))
                .addTag("tenant_node_id", String.valueOf(tenantNodeId))
                .addTag("source_id", String.valueOf(externalSourceJobId))
                .addTag("metric", metricCode)
                .addField("value_float", value)
                .addField("quality", "GOOD")
                .time(measuredAt, WritePrecision.NS);
        influxDBClient.getWriteApiBlocking().writePoint(bucket, org, point);
    }
}
