package com.corp.iot.backend.dashboardtemplate.service;

import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboardtemplate.dto.DashboardTemplateResponse;

import java.util.List;

public interface DashboardTemplateService {

    List<DashboardTemplateResponse> list();

    DashboardResponse applyToNode(Long tenantNodeId, Long templateId);
}
