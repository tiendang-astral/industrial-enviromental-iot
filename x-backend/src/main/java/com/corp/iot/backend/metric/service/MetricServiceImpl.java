package com.corp.iot.backend.metric.service;

import com.corp.iot.backend.metric.dto.MetricResponse;
import com.corp.iot.backend.metric.mapper.MetricMapper;
import com.corp.iot.backend.metric.repository.MetricRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MetricServiceImpl implements MetricService {

    private final MetricRepository metricRepository;
    private final MetricMapper metricMapper;

    @Override
    public List<MetricResponse> list() {
        return metricRepository.findAll().stream().map(metricMapper::toResponse).toList();
    }
}
