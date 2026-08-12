package com.corp.iot.backend.metric.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.metric.dto.MetricResponse;
import com.corp.iot.backend.metric.service.MetricService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/metrics")
@RequiredArgsConstructor
public class MetricController {

    private final MetricService metricService;

    @GetMapping
    public ApiResponse<List<MetricResponse>> list() {
        return ApiResponse.of(metricService.list());
    }
}
