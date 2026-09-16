package com.corp.iot.backend.metric.service;

import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.entity.TenantMetricSetting;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.metric.repository.TenantMetricSettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MetricResolverTest {

    private MetricRepository metricRepository;
    private TenantMetricSettingRepository settingRepository;
    private MetricResolver resolver;

    @BeforeEach
    void setUp() {
        metricRepository = mock(MetricRepository.class);
        settingRepository = mock(TenantMetricSettingRepository.class);
        resolver = new MetricResolver(metricRepository, settingRepository);
    }

    @Test
    void chiSoChuaDatNguongThiTraVeNguongRong() {
        when(metricRepository.findVisible(8L)).thenReturn(List.of(metric(1L, null, "temperature")));
        when(settingRepository.findByMetricIdIn(anyList())).thenReturn(List.of());

        EffectiveMetric result = resolver.listVisible(8L).get(0);

        assertThat(result.minValue()).isNull();
        assertThat(result.maxValue()).isNull();
        assertThat(result.thresholdOverridden()).isFalse();
        assertThat(result.custom()).isFalse();
    }

    @Test
    void nguongCuaTenantDeLenChiSoHeThong() {
        when(metricRepository.findVisible(8L)).thenReturn(List.of(metric(1L, null, "temperature")));
        when(settingRepository.findByMetricIdIn(anyList())).thenReturn(List.of(setting(1L, 20.0, 28.0)));

        EffectiveMetric result = resolver.listVisible(8L).get(0);

        assertThat(result.minValue()).isEqualTo(20.0);
        assertThat(result.maxValue()).isEqualTo(28.0);
        assertThat(result.thresholdOverridden()).isTrue();
    }

    /**
     * Gán ngưỡng lên entity Metric sẽ bị Hibernate dirty-check flush và ghi đè dòng dùng chung cho
     * MỌI tenant — hỏng dữ liệu từ một endpoint chỉ đọc, không log, không exception.
     */
    @Test
    void khongDuocGhiNguongNguocLaiVaoEntityMetric() {
        Metric shared = metric(1L, null, "temperature");
        when(metricRepository.findVisible(8L)).thenReturn(List.of(shared));
        when(settingRepository.findByMetricIdIn(anyList())).thenReturn(List.of(setting(1L, 20.0, 28.0)));

        resolver.listVisible(8L);

        assertThat(shared.getTenantId()).isNull();
        assertThat(shared.getCode()).isEqualTo("temperature");
    }

    @Test
    void chiSoRiengCuaTenantDanhDauCustom() {
        when(metricRepository.findVisible(8L)).thenReturn(List.of(metric(18L, 8L, "feed_weight")));
        when(settingRepository.findByMetricIdIn(anyList())).thenReturn(List.of());

        assertThat(resolver.listVisible(8L).get(0).custom()).isTrue();
    }

    private Metric metric(Long id, Long tenantId, String code) {
        Metric metric = new Metric();
        metric.setId(id);
        metric.setTenantId(tenantId);
        metric.setCode(code);
        metric.setName(code);
        metric.setUnit("°C");
        metric.setDataType("NUMBER");
        return metric;
    }

    private TenantMetricSetting setting(Long metricId, Double min, Double max) {
        TenantMetricSetting setting = new TenantMetricSetting();
        setting.setMetricId(metricId);
        setting.setMinValue(min);
        setting.setMaxValue(max);
        return setting;
    }
}
