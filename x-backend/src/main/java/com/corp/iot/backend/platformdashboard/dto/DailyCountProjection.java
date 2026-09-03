package com.corp.iot.backend.platformdashboard.dto;

import java.time.LocalDate;

/** Projection dùng chung cho query native group-by-ngày (tenant_user, tenant). */
public interface DailyCountProjection {
    LocalDate getDay();
    Long getCnt();
}
