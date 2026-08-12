package com.corp.iot.processing.telemetry;

import com.corp.iot.processing.dto.SensorReadingEvent;
import com.corp.iot.processing.entity.GatewayPin;
import com.corp.iot.processing.entity.Metric;
import com.corp.iot.processing.influx.InfluxWriterService;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.GatewayPinRepository;
import com.corp.iot.processing.repository.GatewayRepository;
import com.corp.iot.processing.repository.MetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

// Orchestrate 1 sensor reading event: dedup -> resolve pin/metric -> ghi InfluxDB
// -> update gateway.last_seen_at -> publish realtime (xem ARCHITECTURE.md § Flow:
// Gateway sensor data, bước 5-7 phần Processing Service).
@Slf4j
@Service
@RequiredArgsConstructor
public class SensorReadingProcessor {

    private static final String DIRECTION_INPUT = "INPUT";

    private final TelemetryDedupService telemetryDedupService;
    private final GatewayPinRepository gatewayPinRepository;
    private final MetricRepository metricRepository;
    private final GatewayRepository gatewayRepository;
    private final InfluxWriterService influxWriterService;
    private final RealtimePublisher realtimePublisher;

    public void process(SensorReadingEvent event) {
        if (!telemetryDedupService.markIfNew(event.tenantId(), event.messageId())) {
            log.debug("Duplicate messageId={}, skip", event.messageId());
            return;
        }

        Optional<GatewayPin> pin = gatewayPinRepository.findByGatewayIdAndTypeAndPinNumberAndDirection(
                event.gatewayId(), event.pinType(), event.pinNumber(), DIRECTION_INPUT);
        if (pin.isEmpty()) {
            log.warn("No matching gateway_pin for gatewayId={}, type={}, pinNumber={}, skip",
                    event.gatewayId(), event.pinType(), event.pinNumber());
            return;
        }
        if (!pin.get().isEnabled()) {
            log.debug("Pin disabled (gatewayId={}, type={}, pinNumber={}), skip",
                    event.gatewayId(), event.pinType(), event.pinNumber());
            return;
        }

        String metricCode = resolveMetricCode(pin.get().getMetricId());
        if (metricCode == null) {
            log.warn("metric_id={} not found for gateway_pin id={}, skip", pin.get().getMetricId(), pin.get().getId());
            return;
        }

        influxWriterService.writeSensorReading(
                event.tenantId(), event.tenantNodeId(), event.gatewayId(), metricCode,
                event.pinType(), event.pinNumber(), event.value(), event.measuredAt());
        gatewayRepository.touchLastSeenAt(event.gatewayId(), Instant.now());
        realtimePublisher.publishSensorReading(
                event.tenantId(), event.tenantNodeId(), event.gatewayId(), metricCode,
                event.pinType(), event.pinNumber(), event.value(), event.measuredAt());
    }

    private String resolveMetricCode(Long metricId) {
        if (metricId == null) {
            return null;
        }
        return metricRepository.findById(metricId).map(Metric::getCode).orElse(null);
    }
}
