package com.corp.iot.backend.dashboardtemplate.dto;

import java.util.Map;

public record TemplateWidget(String widgetType, String metric, Map<String, Object> config) {
}
