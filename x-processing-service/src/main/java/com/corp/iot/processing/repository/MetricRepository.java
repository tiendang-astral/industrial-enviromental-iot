package com.corp.iot.processing.repository;

import com.corp.iot.processing.entity.Metric;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MetricRepository extends JpaRepository<Metric, Long> {
}
