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
    // polling (ARCHITECTURE.md § Flow: External source data).
    //
    // source_field là thứ phân biệt hai kênh của CÙNG một job: một job được phép có 2 kênh cùng
    // metric ở 2 cột khác nhau (uq_datastream_external_field chỉ unique theo cột). Thiếu nhãn này
    // thì hai kênh đó có cùng bộ nhãn + cùng timestamp, InfluxDB coi là một điểm và ghi đè nhau.
    // Dùng tên cột chứ không phải datastream_id để bỏ gán rồi gán lại không mất lịch sử — cùng
    // triết lý với sensor_reading (định danh bằng pin_type+pin_number, không bằng id cấu hình).
    public void writeExternalReading(
            Long tenantId, Long tenantNodeId, Long externalSourceJobId, String sourceField,
            String metricCode, Double value, Instant measuredAt) {
        Point point = Point.measurement("external_reading")
                .addTag("tenant_id", String.valueOf(tenantId))
                .addTag("tenant_node_id", String.valueOf(tenantNodeId))
                .addTag("external_source_job_id", String.valueOf(externalSourceJobId))
                .addTag("source_field", sourceField)
                .addTag("metric", metricCode)
                .addField("value_float", value)
                .addField("quality", "GOOD")
                .time(measuredAt, WritePrecision.NS);
        influxDBClient.getWriteApiBlocking().writePoint(bucket, org, point);
    }
}
