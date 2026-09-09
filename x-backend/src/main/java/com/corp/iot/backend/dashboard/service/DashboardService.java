package com.corp.iot.backend.dashboard.service;

import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboard.dto.UpdateDashboardRequest;

public interface DashboardService {

    DashboardResponse getOrCreate(Long tenantNodeId);

    DashboardResponse save(Long tenantNodeId, UpdateDashboardRequest request);

    /** Board riêng theo 1 external_source (layout riêng, chỉ VALUE/LINE) — xem DATABASE.md § dashboard. */
    DashboardResponse getOrCreateForSource(Long externalSourceId);

    DashboardResponse saveForSource(Long externalSourceId, UpdateDashboardRequest request);
}
