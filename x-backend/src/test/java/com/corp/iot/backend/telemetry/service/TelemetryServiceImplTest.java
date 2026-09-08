package com.corp.iot.backend.telemetry.service;

import com.corp.iot.backend.common.influx.AggregateFn;
import com.corp.iot.backend.common.influx.InfluxReadService;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.entity.SourceType;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.common.influx.ReadingPoint;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.common.security.UserType;
import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.gatewaypin.entity.PinDirection;
import com.corp.iot.backend.gatewaypin.entity.PinType;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.telemetry.dto.DatastreamTelemetryResponse;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TelemetryServiceImplTest {

    private static final AppUserPrincipal PRINCIPAL =
            new AppUserPrincipal(1L, 12L, "operator1", UserType.TENANT, List.of("OPERATOR"));

    private GatewayPinRepository gatewayPinRepository;
    private MetricRepository metricRepository;
    private DatastreamRepository datastreamRepository;
    private InfluxReadService influxReadService;
    private TelemetryServiceImpl service;

    @BeforeEach
    void setUp() {
        gatewayPinRepository = mock(GatewayPinRepository.class);
        metricRepository = mock(MetricRepository.class);
        influxReadService = mock(InfluxReadService.class);
        datastreamRepository = mock(DatastreamRepository.class);
        service = new TelemetryServiceImpl(gatewayPinRepository, metricRepository,
                datastreamRepository, influxReadService);

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
        when(influxReadService.history(12L, 34L, "AI", 1, 60, AggregateFn.MEAN)).thenReturn(List.of());
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
        when(influxReadService.history(12L, 34L, "AI", 1, 60, AggregateFn.MEAN))
                .thenReturn(List.of(new ReadingPoint(22.0, now.minusSeconds(60)), new ReadingPoint(23.5, now)));

        List<PinTelemetryResponse> result = service.getGatewayTelemetry(34L, 60);

        PinTelemetryResponse telemetry = result.get(0);
        assertThat(telemetry.metricCode()).isEqualTo("temperature");
        assertThat(telemetry.unit()).isEqualTo("°C");
        assertThat(telemetry.latestValue()).isEqualTo(23.5);
        assertThat(telemetry.latestMeasuredAt()).isEqualTo(now);
        assertThat(telemetry.history()).hasSize(2);
        assertThat(telemetry.bucketSeconds()).isEqualTo(10); // 1 giờ -> cửa sổ 10 giây
    }

    @Test
    void kenhCoNguongTrenThiGopBangMax() {
        GatewayPin input = pin(1L, PinDirection.INPUT, PinType.AI, 1, 99L);
        Metric withThreshold = metric(99L, "nh3", "ppm");
        withThreshold.setMaxValue(25.0);
        when(gatewayPinRepository.findByGatewayId(34L)).thenReturn(List.of(input));
        when(metricRepository.findById(99L)).thenReturn(Optional.of(withThreshold));
        when(influxReadService.latest(12L, 34L, "AI", 1)).thenReturn(Optional.empty());
        when(influxReadService.history(12L, 34L, "AI", 1, 1440, AggregateFn.MAX)).thenReturn(List.of());

        service.getGatewayTelemetry(34L, 1440);

        // Trung bình hoá một đỉnh vượt ngưỡng thành đường phẳng là giấu mất thứ cần thấy nhất.
        verify(influxReadService).history(12L, 34L, "AI", 1, 1440, AggregateFn.MAX);
        verify(influxReadService, never()).history(12L, 34L, "AI", 1, 1440, AggregateFn.MEAN);
    }

    @Test
    void kenhKhongCoNguongThiGopBangMean() {
        GatewayPin input = pin(1L, PinDirection.INPUT, PinType.AI, 1, 99L);
        when(gatewayPinRepository.findByGatewayId(34L)).thenReturn(List.of(input));
        when(metricRepository.findById(99L)).thenReturn(Optional.of(metric(99L, "temperature", "°C")));
        when(influxReadService.latest(12L, 34L, "AI", 1)).thenReturn(Optional.empty());
        when(influxReadService.history(12L, 34L, "AI", 1, 1440, AggregateFn.MEAN)).thenReturn(List.of());

        service.getGatewayTelemetry(34L, 1440);

        verify(influxReadService).history(12L, 34L, "AI", 1, 1440, AggregateFn.MEAN);
    }

    // Widget biểu đồ trên dashboard chỉ cầm datastreamId — cả hai loại nguồn phải ra CÙNG một DTO,
    // nếu không frontend lại phải biết phía sau là pin hay câu SQL.
    @Test
    void kenhGatewayDocMeasurementSensorReading() {
        Datastream datastream = datastream(7L, SourceType.GATEWAY_PIN, 1L, null, 99L);
        when(datastreamRepository.findById(7L)).thenReturn(Optional.of(datastream));
        when(gatewayPinRepository.findById(1L)).thenReturn(Optional.of(pin(1L, PinDirection.INPUT, PinType.AI, 3, 99L)));
        when(metricRepository.findById(99L)).thenReturn(Optional.of(metric(99L, "temperature", "°C")));
        when(influxReadService.latest(12L, 34L, "AI", 3))
                .thenReturn(Optional.of(new ReadingPoint(23.5, Instant.EPOCH)));
        when(influxReadService.history(12L, 34L, "AI", 3, 60, AggregateFn.MEAN))
                .thenReturn(List.of(new ReadingPoint(23.5, Instant.EPOCH)));

        DatastreamTelemetryResponse result = service.getDatastreamTelemetry(7L, 60);

        assertThat(result.datastreamId()).isEqualTo(7L);
        assertThat(result.unit()).isEqualTo("°C");
        assertThat(result.latestValue()).isEqualTo(23.5);
        assertThat(result.history()).hasSize(1);
        // Hai field chỉ có nghĩa với kênh external.
        assertThat(result.sourceField()).isNull();
        assertThat(result.oldestReadingAt()).isNull();
        verify(influxReadService, never()).historyExternal(anyLong(), anyLong(), anyString(), anyInt(), any());
    }

    @Test
    void kenhExternalDocMeasurementExternalReading() {
        Datastream datastream = datastream(8L, SourceType.EXTERNAL_SOURCE_JOB, 5L, "temp_in", 99L);
        when(datastreamRepository.findById(8L)).thenReturn(Optional.of(datastream));
        when(metricRepository.findById(99L)).thenReturn(Optional.of(metric(99L, "temperature", "°C")));
        when(influxReadService.latestExternal(12L, 5L, "temp_in")).thenReturn(Optional.empty());
        when(influxReadService.historyExternal(12L, 5L, "temp_in", 60, AggregateFn.MEAN)).thenReturn(List.of());

        DatastreamTelemetryResponse result = service.getDatastreamTelemetry(8L, 60);

        assertThat(result.sourceField()).isEqualTo("temp_in");
        verify(influxReadService, never()).history(anyLong(), anyLong(), anyString(), anyInt(), anyInt(), any());
    }

    @Test
    void kenhKhongTonTaiThiBao404() {
        when(datastreamRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDatastreamTelemetry(404L, 60))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("kênh dữ liệu");
    }

    private static Datastream datastream(Long id, SourceType sourceType, Long sourceId, String sourceField, Long metricId) {
        Datastream datastream = new Datastream();
        datastream.setId(id);
        datastream.setName("Kênh " + id);
        datastream.setSourceType(sourceType);
        datastream.setSourceId(sourceId);
        datastream.setSourceField(sourceField);
        datastream.setMetricId(metricId);
        return datastream;
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
