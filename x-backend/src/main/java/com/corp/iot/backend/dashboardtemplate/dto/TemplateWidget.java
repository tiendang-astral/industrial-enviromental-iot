package com.corp.iot.backend.dashboardtemplate.dto;

import com.corp.iot.backend.dashboard.dto.WidgetLayout;

import java.util.Map;

/**
 * Một ô trong mẫu: loại widget, chỉ số cần hiển thị, và **vị trí cố định** trên lưới 12 cột.
 *
 * <p>`layout` khai sẵn được vì cả LINE lẫn VALUE đều nhận nhiều kênh — node có 1 hay 5 kênh cùng
 * chỉ số thì vẫn đúng MỘT ô, nên mẫu không cần biết trước node đích có bao nhiêu kênh.
 */
public record TemplateWidget(String widgetType, String metric, WidgetLayout layout, Map<String, Object> config) {
}
