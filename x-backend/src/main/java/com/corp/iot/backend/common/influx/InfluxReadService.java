package com.corp.iot.backend.common.influx;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

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
                """.formatted(bucket, tenantId, gatewayId, esc(pinType), pinNumber);
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
                """.formatted(bucket, tenantId, externalSourceJobId, esc(sourceField));
        List<ReadingPoint> points = execute(flux);
        return points.isEmpty() ? Optional.empty() : Optional.of(points.get(points.size() - 1));
    }

    public List<ReadingPoint> historyExternal(Long tenantId, Long externalSourceJobId, String sourceField,
                                              int rangeMinutes, AggregateFn fn) {
        String flux = """
                from(bucket: "%s")
                  |> range(start: -%dm)
                  |> filter(fn: (r) => r._measurement == "external_reading" and r._field == "value_float"
                    and r.tenant_id == "%d" and r.external_source_job_id == "%d" and r.source_field == "%s")
                  |> aggregateWindow(every: %s, fn: %s, createEmpty: false)
                  |> sort(columns: ["_time"])
                """.formatted(bucket, rangeMinutes, tenantId, externalSourceJobId, esc(sourceField),
                AggregationWindow.fluxEvery(rangeMinutes), fn.flux());
        return execute(flux);
    }

    /**
     * Lịch sử đã gộp mẫu. Gộp ở đây chứ không ở tầng trên vì mục đích là để dữ liệu KHÔNG rời
     * database dưới dạng thô — thưa bớt sau khi đã tải về thì đã trả giá băng thông rồi.
     */
    public List<ReadingPoint> history(Long tenantId, Long gatewayId, String pinType, Integer pinNumber,
                                      int rangeMinutes, AggregateFn fn) {
        String flux = """
                from(bucket: "%s")
                  |> range(start: -%dm)
                  |> filter(fn: (r) => r._measurement == "sensor_reading" and r._field == "value_float"
                    and r.tenant_id == "%d" and r.gateway_id == "%d" and r.pin_type == "%s" and r.pin_number == "%d")
                  |> aggregateWindow(every: %s, fn: %s, createEmpty: false)
                  |> sort(columns: ["_time"])
                """.formatted(bucket, rangeMinutes, tenantId, gatewayId, esc(pinType), pinNumber,
                AggregationWindow.fluxEvery(rangeMinutes), fn.flux());
        return execute(flux);
    }

    // ---------------------------------------------------------------------------------------
    // Báo cáo (Phase 8): khoảng TUYỆT ĐỐI + gộp nhiều kênh trong một câu truy vấn.
    // ---------------------------------------------------------------------------------------

    /**
     * Bucket phục vụ một khoảng thời gian. Bảng routing ở DATABASE.md §4 (raw → 1m → 5m → 1h → 1d)
     * chưa dùng được: hiện chỉ tồn tại bucket `raw`, các bucket downsampled sinh ra từ job của
     * Phase 9. Trả về `raw` cho mọi khoảng cho tới lúc đó — Phase 9 chỉ cần sửa đúng hàm này.
     */
    public String bucketFor(Instant from, Instant to) {
        return bucket;
    }

    /** Thống kê min/max/trung bình/số điểm của nhiều kênh gateway trong MỘT câu truy vấn. */
    public Map<SensorChannel, ChannelStats> summarizeSensor(
            Long tenantId, Collection<SensorChannel> channels, Instant from, Instant to) {
        if (channels.isEmpty()) {
            return Map.of();
        }
        String predicate = channels.stream()
                .map(c -> "(r.gateway_id == \"%d\" and r.pin_type == \"%s\" and r.pin_number == \"%d\")"
                        .formatted(c.gatewayId(), esc(c.pinType()), c.pinNumber()))
                .collect(Collectors.joining(" or "));
        String flux = """
                from(bucket: "%s")
                  |> range(start: %s, stop: %s)
                  |> filter(fn: (r) => r._measurement == "sensor_reading" and r._field == "value_float"
                    and r.tenant_id == "%d")
                  |> filter(fn: (r) => %s)
                  |> group(columns: ["gateway_id", "pin_type", "pin_number"])
                  %s
                """.formatted(bucketFor(from, to), from, to, tenantId, predicate, REDUCE_STATS);

        Map<SensorChannel, ChannelStats> result = new LinkedHashMap<>();
        for (FluxRecord record : records(flux)) {
            SensorChannel key = new SensorChannel(
                    asLong(record.getValueByKey("gateway_id")),
                    String.valueOf(record.getValueByKey("pin_type")),
                    asInt(record.getValueByKey("pin_number")));
            result.put(key, toStats(record));
        }
        return result;
    }

    /** Thống kê min/max/trung bình/số điểm của nhiều kênh external trong MỘT câu truy vấn. */
    public Map<ExternalChannel, ChannelStats> summarizeExternal(
            Long tenantId, Collection<ExternalChannel> channels, Instant from, Instant to) {
        if (channels.isEmpty()) {
            return Map.of();
        }
        String predicate = channels.stream()
                .map(c -> "(r.external_source_job_id == \"%d\" and r.source_field == \"%s\")"
                        .formatted(c.jobId(), esc(c.sourceField())))
                .collect(Collectors.joining(" or "));
        String flux = """
                from(bucket: "%s")
                  |> range(start: %s, stop: %s)
                  |> filter(fn: (r) => r._measurement == "external_reading" and r._field == "value_float"
                    and r.tenant_id == "%d")
                  |> filter(fn: (r) => %s)
                  |> group(columns: ["external_source_job_id", "source_field"])
                  %s
                """.formatted(bucketFor(from, to), from, to, tenantId, predicate, REDUCE_STATS);

        Map<ExternalChannel, ChannelStats> result = new LinkedHashMap<>();
        for (FluxRecord record : records(flux)) {
            ExternalChannel key = new ExternalChannel(
                    asLong(record.getValueByKey("external_source_job_id")),
                    String.valueOf(record.getValueByKey("source_field")));
            result.put(key, toStats(record));
        }
        return result;
    }

    /** Lịch sử đã gộp mẫu của nhiều kênh gateway trong MỘT câu truy vấn (biểu đồ trong báo cáo). */
    public Map<SensorChannel, List<ReadingPoint>> historySensorRange(
            Long tenantId, Collection<SensorChannel> channels, Instant from, Instant to, AggregateFn fn) {
        if (channels.isEmpty()) {
            return Map.of();
        }
        String predicate = channels.stream()
                .map(c -> "(r.gateway_id == \"%d\" and r.pin_type == \"%s\" and r.pin_number == \"%d\")"
                        .formatted(c.gatewayId(), esc(c.pinType()), c.pinNumber()))
                .collect(Collectors.joining(" or "));
        String flux = """
                from(bucket: "%s")
                  |> range(start: %s, stop: %s)
                  |> filter(fn: (r) => r._measurement == "sensor_reading" and r._field == "value_float"
                    and r.tenant_id == "%d")
                  |> filter(fn: (r) => %s)
                  |> group(columns: ["gateway_id", "pin_type", "pin_number"])
                  |> aggregateWindow(every: %s, fn: %s, createEmpty: false)
                  |> sort(columns: ["_time"])
                """.formatted(bucketFor(from, to), from, to, tenantId, predicate,
                AggregationWindow.fluxEvery(rangeMinutes(from, to)), fn.flux());

        Map<SensorChannel, List<ReadingPoint>> result = new LinkedHashMap<>();
        for (FluxRecord record : records(flux)) {
            SensorChannel key = new SensorChannel(
                    asLong(record.getValueByKey("gateway_id")),
                    String.valueOf(record.getValueByKey("pin_type")),
                    asInt(record.getValueByKey("pin_number")));
            result.computeIfAbsent(key, k -> new java.util.ArrayList<>()).add(toReadingPoint(record));
        }
        return result;
    }

    /** Lịch sử đã gộp mẫu của nhiều kênh external trong MỘT câu truy vấn. */
    public Map<ExternalChannel, List<ReadingPoint>> historyExternalRange(
            Long tenantId, Collection<ExternalChannel> channels, Instant from, Instant to, AggregateFn fn) {
        if (channels.isEmpty()) {
            return Map.of();
        }
        String predicate = channels.stream()
                .map(c -> "(r.external_source_job_id == \"%d\" and r.source_field == \"%s\")"
                        .formatted(c.jobId(), esc(c.sourceField())))
                .collect(Collectors.joining(" or "));
        String flux = """
                from(bucket: "%s")
                  |> range(start: %s, stop: %s)
                  |> filter(fn: (r) => r._measurement == "external_reading" and r._field == "value_float"
                    and r.tenant_id == "%d")
                  |> filter(fn: (r) => %s)
                  |> group(columns: ["external_source_job_id", "source_field"])
                  |> aggregateWindow(every: %s, fn: %s, createEmpty: false)
                  |> sort(columns: ["_time"])
                """.formatted(bucketFor(from, to), from, to, tenantId, predicate,
                AggregationWindow.fluxEvery(rangeMinutes(from, to)), fn.flux());

        Map<ExternalChannel, List<ReadingPoint>> result = new LinkedHashMap<>();
        for (FluxRecord record : records(flux)) {
            ExternalChannel key = new ExternalChannel(
                    asLong(record.getValueByKey("external_source_job_id")),
                    String.valueOf(record.getValueByKey("source_field")));
            result.computeIfAbsent(key, k -> new java.util.ArrayList<>()).add(toReadingPoint(record));
        }
        return result;
    }

    public static int rangeMinutes(Instant from, Instant to) {
        return (int) Math.max(1, java.time.Duration.between(from, to).toMinutes());
    }

    /**
     * Một lượt duyệt ra cả 4 con số. `seeded` thay cho việc khởi tạo min/max bằng ±Inf: Flux không
     * có literal vô cực, mà khởi tạo bằng 0 sẽ kéo min của một kênh toàn giá trị dương về 0.
     */
    private static final String REDUCE_STATS = """
            |> reduce(identity: {n: 0.0, sum: 0.0, mn: 0.0, mx: 0.0, seeded: false},
                  fn: (r, accumulator) => ({
                    n: accumulator.n + 1.0,
                    sum: accumulator.sum + r._value,
                    mn: if not accumulator.seeded or r._value < accumulator.mn then r._value else accumulator.mn,
                    mx: if not accumulator.seeded or r._value > accumulator.mx then r._value else accumulator.mx,
                    seeded: true
                  }))""";

    private ChannelStats toStats(FluxRecord record) {
        double n = asDouble(record.getValueByKey("n"), 0);
        if (n <= 0) {
            return new ChannelStats(0, null, null, null);
        }
        double sum = asDouble(record.getValueByKey("sum"), 0);
        return new ChannelStats(
                (long) n,
                asDouble(record.getValueByKey("mn"), Double.NaN),
                asDouble(record.getValueByKey("mx"), Double.NaN),
                sum / n);
    }

    private List<FluxRecord> records(String flux) {
        return influxDBClient.getQueryApi().query(flux, org).stream()
                .flatMap(table -> table.getRecords().stream())
                .toList();
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

    /** Tag do người dùng đặt tên (source_field) ghép thẳng vào câu Flux — chặn thoát khỏi chuỗi. */
    private static String esc(String raw) {
        return raw == null ? "" : raw.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static Long asLong(Object raw) {
        return raw == null ? null : Long.valueOf(String.valueOf(raw));
    }

    private static Integer asInt(Object raw) {
        return raw == null ? null : Integer.valueOf(String.valueOf(raw));
    }

    private static Double asDouble(Object raw, double fallback) {
        if (raw instanceof Number number) {
            return number.doubleValue();
        }
        return Double.isNaN(fallback) ? null : fallback;
    }
}
