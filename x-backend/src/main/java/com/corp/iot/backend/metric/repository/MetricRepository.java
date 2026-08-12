package com.corp.iot.backend.metric.repository;

import com.corp.iot.backend.metric.entity.Metric;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MetricRepository extends JpaRepository<Metric, Long> {

    Optional<Metric> findByCode(String code);
}
