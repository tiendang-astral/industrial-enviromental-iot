package com.corp.iot.backend.telemetry.service;

import com.corp.iot.backend.common.influx.InfluxReadService;
import com.corp.iot.backend.common.influx.ReadingPoint;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.common.security.UserType;
import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.gatewaypin.entity.PinDirection;
import com.corp.iot.backend.gatewaypin.entity.PinType;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.telemetry.dto.PinTelemetryResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TelemetryServiceImplTest {

    private static final AppUserPrincipal PRINCIPAL =
            new AppUserPrincipal(1L, 12L, "operator1", UserType.TENANT, List.of("OPERATOR"));

    private GatewayPinRepository gatewayPinRepository;
    private MetricRepository metricRepository;
    private InfluxReadService influxReadService;
    private TelemetryServiceImpl service;

    @BeforeEach
    void setUp() {
        gatewayPinRepository = mock(GatewayPinRepository.class);
        metricRepository = mock(MetricRepository.class);
        influxReadService = mock(InfluxReadService.class);
        service = new TelemetryServiceImpl(gatewayPinRepository, metricRepository, influxReadService);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(PRINCIPAL, null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void excludesOutputPinsFromResponse() {
        GatewayPin input = pin(1L, PinDirection.INPUT, PinType.AI, 1, 99L);
        GatewayPin output = pin(2L, PinDirection.OUTPUT, PinType.DO, 1, null);
        when(gatewayPinRepository.findByGatewayId(34L)).thenReturn(List.of(input, output));
        when(influxReadService.latest(12L, 34L, "AI", 1)).thenReturn(Optional.empty());
        when(influxReadService.history(12L, 34L, "AI", 1, 60)).thenReturn(List.of());
        when(metricRepository.findById(99L)).thenReturn(Optional.of(metric(99L, "temperature", "°C")));

        List<PinTelemetryResponse> result = service.getGatewayTelemetry(34L, 60);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).pinId()).isEqualTo(1L);
        verify(influxReadService, never()).latest(12L, 34L, "DO", 1);
    }

    @Test
    void mapsLatestAndHistoryFromInflux() {
        GatewayPin input = pin(1L, PinDirection.INPUT, PinType.AI, 1, 99L);
        when(gatewayPinRepository.findByGatewayId(34L)).thenReturn(List.of(input));
        when(metricRepository.findById(99L)).thenReturn(Optional.of(metric(99L, "temperature", "°C")));
        Instant now = Instant.parse("2026-08-12T10:00:00Z");
        when(influxReadService.latest(12L, 34L, "AI", 1)).thenReturn(Optional.of(new ReadingPoint(23.5, now)));
        when(influxReadService.history(12L, 34L, "AI", 1, 60))
                .thenReturn(List.of(new ReadingPoint(22.0, now.minusSeconds(60)), new ReadingPoint(23.5, now)));

        List<PinTelemetryResponse> result = service.getGatewayTelemetry(34L, 60);

        PinTelemetryResponse telemetry = result.get(0);
        assertThat(telemetry.metricCode()).isEqualTo("temperature");
        assertThat(telemetry.unit()).isEqualTo("°C");
        assertThat(telemetry.latestValue()).isEqualTo(23.5);
        assertThat(telemetry.latestMeasuredAt()).isEqualTo(now);
        assertThat(telemetry.history()).hasSize(2);
    }

    private GatewayPin pin(Long id, PinDirection direction, PinType type, Integer pinNumber, Long metricId) {
        GatewayPin pin = new GatewayPin();
        pin.setId(id);
        pin.setGatewayId(34L);
        pin.setDirection(direction);
        pin.setType(type);
        pin.setName("Pin " + id);
        pin.setPinNumber(pinNumber);
        pin.setMetricId(metricId);
        return pin;
    }

    private Metric metric(Long id, String code, String unit) {
        Metric metric = new Metric();
        metric.setId(id);
        metric.setCode(code);
        metric.setUnit(unit);
        return metric;
    }
}
