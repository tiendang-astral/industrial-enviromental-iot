package com.corp.iot.backend.dashboardtemplate.dto;

import java.util.List;

public record DashboardTemplateResponse(Long id, String name, String description, List<TemplateWidget> layoutJson) {
}
