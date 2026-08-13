package com.corp.iot.backend.dashboard.dto;

import java.util.List;

public record DashboardResponse(Long id, Long tenantNodeId, Long externalSourceId, String name, List<Widget> widgets) {
}
