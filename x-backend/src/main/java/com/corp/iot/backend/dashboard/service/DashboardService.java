package com.corp.iot.backend.dashboard.service;

import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboard.dto.UpdateDashboardRequest;
import com.corp.iot.backend.dashboard.entity.Dashboard;

public interface DashboardService {

    DashboardResponse getOrCreate(Long tenantNodeId);

    DashboardResponse save(Long tenantNodeId, UpdateDashboardRequest request);

    /** Dùng nội bộ bởi DashboardTemplateService để append widget vào board hiện có. */
    Dashboard getOrCreateEntity(Long tenantNodeId);

    /** Board riêng theo 1 external_source (layout riêng, chỉ VALUE/LINE) — xem DATABASE.md § dashboard. */
    DashboardResponse getOrCreateForSource(Long externalSourceId);

    DashboardResponse saveForSource(Long externalSourceId, UpdateDashboardRequest request);
}
