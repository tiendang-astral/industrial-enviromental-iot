package com.corp.iot.backend.metric.repository;

import com.corp.iot.backend.metric.entity.TenantMetricSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TenantMetricSettingRepository extends JpaRepository<TenantMetricSetting, Long> {

    List<TenantMetricSetting> findByMetricIdIn(List<Long> metricIds);

    Optional<TenantMetricSetting> findByMetricId(Long metricId);

    void deleteByMetricId(Long metricId);
}
