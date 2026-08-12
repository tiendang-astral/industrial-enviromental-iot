package com.corp.iot.backend.dashboard.dto;

import java.util.List;

// Mapped trực tiếp vào cột dashboard.layout_json (jsonb) qua @JdbcTypeCode(SqlTypes.JSON)
// (Hibernate 7 + Jackson, không cần thư viện ngoài) — xem entity Dashboard.
public record DashboardLayout(List<Widget> widgets) {

    public static DashboardLayout empty() {
        return new DashboardLayout(List.of());
    }
}
