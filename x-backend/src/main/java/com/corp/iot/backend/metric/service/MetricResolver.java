package com.corp.iot.backend.metric.service;

import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.entity.TenantMetricSetting;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.metric.repository.TenantMetricSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Nơi DUY NHẤT ghép ngưỡng của tenant vào định nghĩa chỉ số. Đọc thẳng MetricRepository ở chỗ khác
 * là lấy chỉ số không có ngưỡng.
 */
@Service
@RequiredArgsConstructor
public class MetricResolver {

    private final MetricRepository metricRepository;
    private final TenantMetricSettingRepository settingRepository;

    /** Chỉ số hệ thống + chỉ số riêng của tenant, đã áp ngưỡng. */
    @Transactional(readOnly = true)
    public List<EffectiveMetric> listVisible(Long tenantId) {
        List<Metric> metrics = metricRepository.findVisible(tenantId);
        Map<Long, TenantMetricSetting> settings = settingsByMetricId(metrics.stream().map(Metric::getId).toList());
        return metrics.stream().map(metric -> merge(metric, settings.get(metric.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public EffectiveMetric resolve(Metric metric) {
        return merge(metric, settingRepository.findByMetricId(metric.getId()).orElse(null));
    }

    private Map<Long, TenantMetricSetting> settingsByMetricId(List<Long> metricIds) {
        if (metricIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, TenantMetricSetting> byMetricId = new HashMap<>();
        // @TenantId trên TenantMetricSetting đã giới hạn trong tenant đang gọi.
        settingRepository.findByMetricIdIn(metricIds).forEach(s -> byMetricId.put(s.getMetricId(), s));
        return byMetricId;
    }

    private EffectiveMetric merge(Metric metric, TenantMetricSetting setting) {
        return new EffectiveMetric(
                metric.getId(),
                metric.getCode(),
                metric.getName(),
                metric.getUnit(),
                metric.getDataType(),
                metric.getColor(),
                setting != null ? setting.getMinValue() : null,
                setting != null ? setting.getMaxValue() : null,
                metric.getTenantId() != null,
                setting != null
        );
    }
}
