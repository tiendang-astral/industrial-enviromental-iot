package com.corp.iot.backend.metric.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.metric.dto.CreateMetricRequest;
import com.corp.iot.backend.metric.dto.MetricResponse;
import com.corp.iot.backend.metric.dto.UpdateMetricRequest;
import com.corp.iot.backend.metric.dto.UpdateMetricThresholdRequest;
import com.corp.iot.backend.metric.service.MetricService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Đọc mở cho mọi vai trò (dashboard/biểu đồ nào cũng cần danh sách chỉ số); ghi giới hạn
 * TENANT_ADMIN vì chỉ số có phạm vi toàn tenant, không gắn với một đơn vị nào.
 */
@RestController
@RequestMapping("/api/v1/metrics")
@RequiredArgsConstructor
public class MetricController {

    private final MetricService metricService;

    @GetMapping
    public ApiResponse<List<MetricResponse>> list() {
        return ApiResponse.of(metricService.list());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('TENANT_ADMIN')")
    public ApiResponse<MetricResponse> create(@Valid @RequestBody CreateMetricRequest request) {
        return ApiResponse.of(metricService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('TENANT_ADMIN')")
    public ApiResponse<MetricResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateMetricRequest request) {
        return ApiResponse.of(metricService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('TENANT_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        metricService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/threshold")
    @PreAuthorize("hasAuthority('TENANT_ADMIN')")
    public ApiResponse<MetricResponse> setThreshold(
            @PathVariable Long id, @Valid @RequestBody UpdateMetricThresholdRequest request) {
        return ApiResponse.of(metricService.setThreshold(id, request));
    }

    @DeleteMapping("/{id}/threshold")
    @PreAuthorize("hasAuthority('TENANT_ADMIN')")
    public ApiResponse<MetricResponse> resetThreshold(@PathVariable Long id) {
        return ApiResponse.of(metricService.resetThreshold(id));
    }
}
