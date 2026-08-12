package com.corp.iot.backend.telemetry.service;

import com.corp.iot.backend.common.influx.InfluxReadService;
import com.corp.iot.backend.common.influx.ReadingPoint;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.gatewaypin.entity.PinDirection;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.telemetry.dto.PinTelemetryResponse;
import com.corp.iot.backend.telemetry.dto.ReadingPointDto;
import lombok.RequiredArgsConstructor;
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
    private final InfluxReadService influxReadService;

    @Override
    public List<PinTelemetryResponse> getGatewayTelemetry(Long gatewayId, int rangeMinutes) {
        Long tenantId = currentPrincipal().tenantId();
        return gatewayPinRepository.findByGatewayId(gatewayId).stream()
                .filter(pin -> pin.getDirection() == PinDirection.INPUT)
                .map(pin -> toTelemetry(tenantId, gatewayId, pin, rangeMinutes))
                .toList();
    }

    private PinTelemetryResponse toTelemetry(Long tenantId, Long gatewayId, GatewayPin pin, int rangeMinutes) {
        String pinType = pin.getType().name();
        Optional<ReadingPoint> latest = influxReadService.latest(tenantId, gatewayId, pinType, pin.getPinNumber());
        List<ReadingPointDto> history = influxReadService
                .history(tenantId, gatewayId, pinType, pin.getPinNumber(), rangeMinutes).stream()
                .map(point -> new ReadingPointDto(point.value(), point.measuredAt()))
                .toList();
        Metric metric = pin.getMetricId() != null ? metricRepository.findById(pin.getMetricId()).orElse(null) : null;

        return new PinTelemetryResponse(
                pin.getId(),
                pin.getPinNumber(),
                pinType,
                pin.getName(),
                metric != null ? metric.getCode() : null,
                metric != null ? metric.getUnit() : null,
                latest.map(ReadingPoint::value).orElse(null),
                latest.map(ReadingPoint::measuredAt).orElse(null),
                history
        );
    }

    private AppUserPrincipal currentPrincipal() {
        return (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
