package com.corp.iot.backend.metric.service;

import com.corp.iot.backend.alertrule.repository.AlertRuleRepository;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.common.security.UserType;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import com.corp.iot.backend.metric.dto.CreateMetricRequest;
import com.corp.iot.backend.metric.dto.UpdateMetricRequest;
import com.corp.iot.backend.metric.dto.UpdateMetricThresholdRequest;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.mapper.MetricMapper;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.metric.repository.TenantMetricSettingRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MetricServiceImplTest {

    private static final AppUserPrincipal PRINCIPAL =
            new AppUserPrincipal(1L, 8L, "admin1", UserType.TENANT, List.of("TENANT_ADMIN"));

    private MetricRepository metricRepository;
    private TenantMetricSettingRepository settingRepository;
    private GatewayPinRepository gatewayPinRepository;
    private DatastreamRepository datastreamRepository;
    private AlertRuleRepository alertRuleRepository;
    private MetricServiceImpl service;

    @BeforeEach
    void setUp() {
        metricRepository = mock(MetricRepository.class);
        settingRepository = mock(TenantMetricSettingRepository.class);
        gatewayPinRepository = mock(GatewayPinRepository.class);
        datastreamRepository = mock(DatastreamRepository.class);
        alertRuleRepository = mock(AlertRuleRepository.class);
        service = new MetricServiceImpl(metricRepository, settingRepository,
                new MetricResolver(metricRepository, settingRepository), new MetricMapper(),
                gatewayPinRepository, datastreamRepository, alertRuleRepository);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(PRINCIPAL, null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    /** uq_metric_code không chặn được vì COALESCE tách hai phạm vi sở hữu. */
    @Test
    void trungCodeVoiChiSoHeThongBiChan() {
        when(metricRepository.codeTaken(anyString(), anyLong())).thenReturn(true);

        assertThatThrownBy(() -> service.create(
                new CreateMetricRequest("temperature", "Nhiệt độ riêng", "°C", "chart-1", null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("đã tồn tại");
    }

    @Test
    void mauNgoaiBangTokenBiChan() {
        assertThatThrownBy(() -> service.create(
                new CreateMetricRequest("feed_weight", "Khối lượng cám", "kg", "#ff0000", null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Màu không hợp lệ");
    }

    @Test
    void khongSuaDuocDinhNghiaChiSoHeThong() {
        when(metricRepository.findById(1L)).thenReturn(Optional.of(metric(1L, null)));

        assertThatThrownBy(() -> service.update(1L, new UpdateMetricRequest("Tên mới", "°C", "chart-1")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("chỉ đổi được ngưỡng");
    }

    @Test
    void xoaChiSoDangDuocDungBiChan() {
        when(metricRepository.findById(18L)).thenReturn(Optional.of(metric(18L, 8L)));
        when(gatewayPinRepository.existsByMetricId(18L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(18L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("đang được dùng");
    }

    /** Metric không có @TenantId nên findById trả về cả chỉ số của tenant khác. */
    @Test
    void khongChamDuocChiSoRiengCuaTenantKhac() {
        when(metricRepository.findById(50L)).thenReturn(Optional.of(metric(50L, 10L)));

        assertThatThrownBy(() -> service.setThreshold(50L, new UpdateMetricThresholdRequest(0.0, 8.0)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Không tìm thấy chỉ số");
    }

    @Test
    void nguongDuoiPhaiNhoHonNguongTren() {
        when(metricRepository.findById(1L)).thenReturn(Optional.of(metric(1L, null)));

        assertThatThrownBy(() -> service.setThreshold(1L, new UpdateMetricThresholdRequest(28.0, 20.0)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("nhỏ hơn ngưỡng trên");
    }

    private Metric metric(Long id, Long tenantId) {
        Metric metric = new Metric();
        metric.setId(id);
        metric.setTenantId(tenantId);
        metric.setCode("temperature");
        metric.setName("Nhiệt độ");
        metric.setUnit("°C");
        metric.setDataType("NUMBER");
        return metric;
    }
}
