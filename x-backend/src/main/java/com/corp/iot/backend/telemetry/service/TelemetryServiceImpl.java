package com.corp.iot.backend.telemetry.service;

import com.corp.iot.backend.common.influx.AggregateFn;
import com.corp.iot.backend.common.influx.AggregationWindow;
import com.corp.iot.backend.common.influx.InfluxReadService;
import com.corp.iot.backend.common.influx.ReadingPoint;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.entity.SourceType;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.gatewaypin.entity.PinDirection;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.telemetry.dto.DatastreamTelemetryResponse;
import com.corp.iot.backend.telemetry.dto.PinTelemetryResponse;
import com.corp.iot.backend.telemetry.dto.ReadingPointDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

// Gộp metadata pin (Postgres) + giá trị đo (InfluxDB) cho trang Chi tiết Gateway —
// chỉ pin INPUT (OUTPUT không có dữ liệu đo, xem PLAN.md quyết định phạm vi).
@Service
@RequiredArgsConstructor
public class TelemetryServiceImpl implements TelemetryService {

    private final GatewayPinRepository gatewayPinRepository;
    private final MetricRepository metricRepository;
    private final DatastreamRepository datastreamRepository;
    private final InfluxReadService influxReadService;

    @Override
    public List<PinTelemetryResponse> getGatewayTelemetry(Long gatewayId, int rangeMinutes) {
        Long tenantId = currentPrincipal().tenantId();
        return gatewayPinRepository.findByGatewayId(gatewayId).stream()
                .filter(pin -> pin.getDirection() == PinDirection.INPUT)
                .map(pin -> toTelemetry(tenantId, gatewayId, pin, rangeMinutes))
                .toList();
    }

    @Override
    public List<DatastreamTelemetryResponse> getExternalSourceTelemetry(Long externalSourceId, int rangeMinutes) {
        Long tenantId = currentPrincipal().tenantId();
        return datastreamRepository.findByExternalSourceId(externalSourceId).stream()
                .map(datastream -> toTelemetry(tenantId, datastream, rangeMinutes, true))
                .toList();
    }

    @Override
    public DatastreamTelemetryResponse getDatastreamTelemetry(Long datastreamId, int rangeMinutes, boolean includeHistory) {
        Long tenantId = currentPrincipal().tenantId();
        Datastream datastream = datastreamRepository.findById(datastreamId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "DATASTREAM_NOT_FOUND", "Không tìm thấy kênh dữ liệu"));
        return datastream.getSourceType() == SourceType.GATEWAY_PIN
                ? fromGatewayPin(tenantId, datastream, rangeMinutes, includeHistory)
                : toTelemetry(tenantId, datastream, rangeMinutes, includeHistory);
    }

    /**
     * Kênh gateway đọc measurement khác (`sensor_reading`) và định danh bằng pin chứ không bằng cột,
     * nhưng trả về CÙNG một DTO: nơi gọi chỉ quan tâm "kênh này có số đo gì", không quan tâm nguồn.
     */
    private DatastreamTelemetryResponse fromGatewayPin(Long tenantId, Datastream datastream, int rangeMinutes, boolean includeHistory) {
        GatewayPin pin = gatewayPinRepository.findById(datastream.getSourceId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "PIN_NOT_FOUND", "Không tìm thấy chân gateway của kênh"));
        String pinType = pin.getType().name();
        Metric metric = metricRepository.findById(datastream.getMetricId()).orElse(null);
        Optional<ReadingPoint> latest = influxReadService.latest(tenantId, pin.getGatewayId(), pinType, pin.getPinNumber());
        List<ReadingPointDto> history = includeHistory
                ? influxReadService
                        .history(tenantId, pin.getGatewayId(), pinType, pin.getPinNumber(), rangeMinutes, aggregateFn(metric)).stream()
                        .map(point -> new ReadingPointDto(point.value(), point.measuredAt()))
                        .toList()
                : List.of();

        return new DatastreamTelemetryResponse(
                datastream.getId(),
                datastream.getName(),
                null, // sourceField chỉ có ở kênh external
                metric != null ? metric.getCode() : null,
                metric != null ? metric.getUnit() : null,
                latest.map(ReadingPoint::value).orElse(null),
                latest.map(ReadingPoint::measuredAt).orElse(null),
                null, // oldestReadingAt: chỉ external mới có khái niệm đọc lại lịch sử
                includeHistory ? AggregationWindow.windowSeconds(rangeMinutes) : null,
                history
        );
    }

    private DatastreamTelemetryResponse toTelemetry(Long tenantId, Datastream datastream, int rangeMinutes, boolean includeHistory) {
        // Lọc theo (job, cột): 2 kênh cùng job có thể chung metric, lọc theo metric sẽ trộn lẫn.
        Long jobId = datastream.getSourceId();
        String sourceField = datastream.getSourceField();
        Metric metric = metricRepository.findById(datastream.getMetricId()).orElse(null);
        Optional<ReadingPoint> latest = influxReadService.latestExternal(tenantId, jobId, sourceField);
        List<ReadingPointDto> history = includeHistory
                ? influxReadService
                        .historyExternal(tenantId, jobId, sourceField, rangeMinutes, aggregateFn(metric)).stream()
                        .map(point -> new ReadingPointDto(point.value(), point.measuredAt()))
                        .toList()
                : List.of();

        return new DatastreamTelemetryResponse(
                datastream.getId(),
                datastream.getName(),
                sourceField,
                metric != null ? metric.getCode() : null,
                metric != null ? metric.getUnit() : null,
                latest.map(ReadingPoint::value).orElse(null),
                latest.map(ReadingPoint::measuredAt).orElse(null),
                datastream.getOldestReadingAt(),
                includeHistory ? AggregationWindow.windowSeconds(rangeMinutes) : null,
                history
        );
    }

    private PinTelemetryResponse toTelemetry(Long tenantId, Long gatewayId, GatewayPin pin, int rangeMinutes) {
        String pinType = pin.getType().name();
        Metric metric = pin.getMetricId() != null ? metricRepository.findById(pin.getMetricId()).orElse(null) : null;
        Optional<ReadingPoint> latest = influxReadService.latest(tenantId, gatewayId, pinType, pin.getPinNumber());
        List<ReadingPointDto> history = influxReadService
                .history(tenantId, gatewayId, pinType, pin.getPinNumber(), rangeMinutes, aggregateFn(metric)).stream()
                .map(point -> new ReadingPointDto(point.value(), point.measuredAt()))
                .toList();

        return new PinTelemetryResponse(
                pin.getId(),
                pin.getPinNumber(),
                pinType,
                pin.getName(),
                metric != null ? metric.getCode() : null,
                metric != null ? metric.getUnit() : null,
                latest.map(ReadingPoint::value).orElse(null),
                latest.map(ReadingPoint::measuredAt).orElse(null),
                AggregationWindow.windowSeconds(rangeMinutes),
                history
        );
    }

    // Kênh có ngưỡng trên thì gộp bằng MAX: trung bình hoá một đỉnh vượt ngưỡng thành đường phẳng
    // là giấu mất đúng thứ người trực ca cần thấy.
    private AggregateFn aggregateFn(Metric metric) {
        return metric != null && metric.getMaxValue() != null ? AggregateFn.MAX : AggregateFn.MEAN;
    }

    private AppUserPrincipal currentPrincipal() {
        return (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
