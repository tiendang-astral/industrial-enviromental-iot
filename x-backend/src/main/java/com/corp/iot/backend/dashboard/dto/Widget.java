package com.corp.iot.backend.dashboard.dto;

import java.util.Map;

// type ∈ VALUE/LINE/DEVICE_COUNT/DEVICES_ONLINE (đợt 1 — xem PLAN.md Phase 4).
public record Widget(
        String id,
        String type,
        WidgetLayout layout,
        String title,
        WidgetBinding binding,
        Map<String, Object> config
) {
}
