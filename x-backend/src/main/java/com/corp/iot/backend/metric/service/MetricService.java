package com.corp.iot.backend.metric.service;

import com.corp.iot.backend.metric.dto.MetricResponse;

import java.util.List;

public interface MetricService {

    List<MetricResponse> list();
}
