package com.corp.iot.backend.platformdashboard.service;

import com.corp.iot.backend.platformdashboard.dto.PlatformDashboardSummaryResponse;
import com.corp.iot.backend.platformdashboard.dto.TrendPointResponse;
import com.corp.iot.backend.platformdashboard.dto.TrendRange;

import java.util.List;

public interface PlatformDashboardService {

    PlatformDashboardSummaryResponse getSummary();

    List<TrendPointResponse> getUserTrend(TrendRange range);

    List<TrendPointResponse> getTenantTrend(TrendRange range);
}
