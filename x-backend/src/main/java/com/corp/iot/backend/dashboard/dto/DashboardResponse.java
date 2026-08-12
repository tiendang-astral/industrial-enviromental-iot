package com.corp.iot.backend.dashboard.dto;

import java.util.List;

public record DashboardResponse(Long id, Long tenantNodeId, String name, List<Widget> widgets) {
}
