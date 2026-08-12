package com.corp.iot.backend.dashboard.service;

import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboard.dto.UpdateDashboardRequest;
import com.corp.iot.backend.dashboard.entity.Dashboard;

public interface DashboardService {

    DashboardResponse getOrCreate(Long tenantNodeId);

    DashboardResponse save(Long tenantNodeId, UpdateDashboardRequest request);

    /** Dùng nội bộ bởi DashboardTemplateService để append widget vào board hiện có. */
    Dashboard getOrCreateEntity(Long tenantNodeId);
}
