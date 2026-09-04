package com.corp.iot.backend.common.influx;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

// Đọc InfluxDB measurement sensor_reading (bucket raw, retention 7 ngày — xem
// DATABASE.md §4) cho trang Chi tiết Gateway. Tag pin_type/pin_number bắt buộc để
// phân biệt đúng pin khi nhiều pin chung metric.
@Service
@RequiredArgsConstructor
public class InfluxReadService {

    private final InfluxDBClient influxDBClient;

    @Value("${influx.org}")
    private String org;

    @Value("${influx.bucket}")
    private String bucket;

    public Optional<ReadingPoint> latest(Long tenantId, Long gatewayId, String pinType, Integer pinNumber) {
        String flux = """
                from(bucket: "%s")
                  |> range(start: -8d)
                  |> filter(fn: (r) => r._measurement == "sensor_reading" and r._field == "value_float"
                    and r.tenant_id == "%d" and r.gateway_id == "%d" and r.pin_type == "%s" and r.pin_number == "%d")
                  |> last()
                """.formatted(bucket, tenantId, gatewayId, pinType, pinNumber);
        List<ReadingPoint> points = execute(flux);
        return points.isEmpty() ? Optional.empty() : Optional.of(points.get(points.size() - 1));
    }

    // Đọc InfluxDB measurement external_reading (xem DATABASE.md §4) cho trang chi tiết
    // External Source. Lọc theo (job, cột) chứ không theo metric: một job được phép có 2 kênh
    // cùng metric ở 2 cột khác nhau, lọc theo metric sẽ trộn chúng làm một.
    public Optional<ReadingPoint> latestExternal(Long tenantId, Long externalSourceJobId, String sourceField) {
        String flux = """
                from(bucket: "%s")
                  |> range(start: -8d)
                  |> filter(fn: (r) => r._measurement == "external_reading" and r._field == "value_float"
                    and r.tenant_id == "%d" and r.external_source_job_id == "%d" and r.source_field == "%s")
                  |> last()
                """.formatted(bucket, tenantId, externalSourceJobId, sourceField);
        List<ReadingPoint> points = execute(flux);
        return points.isEmpty() ? Optional.empty() : Optional.of(points.get(points.size() - 1));
    }

    public List<ReadingPoint> historyExternal(Long tenantId, Long externalSourceJobId, String sourceField, int rangeMinutes) {
        String flux = """
                from(bucket: "%s")
                  |> range(start: -%dm)
                  |> filter(fn: (r) => r._measurement == "external_reading" and r._field == "value_float"
                    and r.tenant_id == "%d" and r.external_source_job_id == "%d" and r.source_field == "%s")
                  |> sort(columns: ["_time"])
                """.formatted(bucket, rangeMinutes, tenantId, externalSourceJobId, sourceField);
        return execute(flux);
    }

    public List<ReadingPoint> history(Long tenantId, Long gatewayId, String pinType, Integer pinNumber, int rangeMinutes) {
        String flux = """
                from(bucket: "%s")
                  |> range(start: -%dm)
                  |> filter(fn: (r) => r._measurement == "sensor_reading" and r._field == "value_float"
                    and r.tenant_id == "%d" and r.gateway_id == "%d" and r.pin_type == "%s" and r.pin_number == "%d")
                  |> sort(columns: ["_time"])
                """.formatted(bucket, rangeMinutes, tenantId, gatewayId, pinType, pinNumber);
        return execute(flux);
    }

    private List<ReadingPoint> execute(String flux) {
        List<FluxTable> tables = influxDBClient.getQueryApi().query(flux, org);
        return tables.stream()
                .flatMap(table -> table.getRecords().stream())
                .map(this::toReadingPoint)
                .toList();
    }

    private ReadingPoint toReadingPoint(FluxRecord record) {
        Object value = record.getValue();
        double doubleValue = value instanceof Number number ? number.doubleValue() : 0.0;
        return new ReadingPoint(doubleValue, record.getTime());
    }
}
