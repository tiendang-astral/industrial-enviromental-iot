package com.corp.iot.backend.dashboard.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateDashboardRequest(
        @NotNull DashboardLayout layoutJson
) {
}
