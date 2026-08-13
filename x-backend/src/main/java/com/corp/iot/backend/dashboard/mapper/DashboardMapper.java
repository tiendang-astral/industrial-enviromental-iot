package com.corp.iot.backend.dashboard.mapper;

import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboard.entity.Dashboard;
import org.springframework.stereotype.Component;

@Component
public class DashboardMapper {

    public DashboardResponse toResponse(Dashboard dashboard) {
        return new DashboardResponse(
                dashboard.getId(),
                dashboard.getTenantNodeId(),
                dashboard.getExternalSourceId(),
                dashboard.getName(),
                dashboard.getLayoutJson().widgets()
        );
    }
}
