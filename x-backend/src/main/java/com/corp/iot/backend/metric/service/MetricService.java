package com.corp.iot.backend.metric.service;

import com.corp.iot.backend.metric.dto.CreateMetricRequest;
import com.corp.iot.backend.metric.dto.MetricResponse;
import com.corp.iot.backend.metric.dto.UpdateMetricRequest;
import com.corp.iot.backend.metric.dto.UpdateMetricThresholdRequest;

import java.util.List;

public interface MetricService {

    List<MetricResponse> list();

    MetricResponse create(CreateMetricRequest request);

    MetricResponse update(Long id, UpdateMetricRequest request);

    void delete(Long id);

    MetricResponse setThreshold(Long id, UpdateMetricThresholdRequest request);

    MetricResponse resetThreshold(Long id);
}
