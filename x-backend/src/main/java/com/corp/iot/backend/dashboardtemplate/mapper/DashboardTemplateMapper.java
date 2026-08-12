package com.corp.iot.backend.dashboardtemplate.mapper;

import com.corp.iot.backend.dashboardtemplate.dto.DashboardTemplateResponse;
import com.corp.iot.backend.dashboardtemplate.entity.DashboardTemplate;
import org.springframework.stereotype.Component;

@Component
public class DashboardTemplateMapper {

    public DashboardTemplateResponse toResponse(DashboardTemplate template) {
        return new DashboardTemplateResponse(
                template.getId(),
                template.getName(),
                template.getDescription(),
                template.getLayoutJson()
        );
    }
}
