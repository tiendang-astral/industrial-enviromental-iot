package com.corp.iot.backend.dashboard.service;

import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.dashboard.dto.DashboardLayout;
import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboard.dto.UpdateDashboardRequest;
import com.corp.iot.backend.dashboard.entity.Dashboard;
import com.corp.iot.backend.dashboard.mapper.DashboardMapper;
import com.corp.iot.backend.dashboard.repository.DashboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private static final String DEFAULT_NAME = "Dashboard";

    private final DashboardRepository dashboardRepository;
    private final DashboardMapper dashboardMapper;

    @Override
    @Transactional
    public DashboardResponse getOrCreate(Long tenantNodeId) {
        return dashboardMapper.toResponse(getOrCreateEntity(tenantNodeId));
    }

    @Override
    @Transactional
    public DashboardResponse save(Long tenantNodeId, UpdateDashboardRequest request) {
        Dashboard dashboard = getOrCreateEntity(tenantNodeId);
        dashboard.setLayoutJson(request.layoutJson());
        dashboardRepository.save(dashboard);
        return dashboardMapper.toResponse(dashboard);
    }

    @Override
    @Transactional
    public Dashboard getOrCreateEntity(Long tenantNodeId) {
        AppUserPrincipal principal = currentPrincipal();
        return dashboardRepository.findByUserIdAndTenantNodeId(principal.userId(), tenantNodeId)
                .orElseGet(() -> {
                    Dashboard dashboard = new Dashboard();
                    dashboard.setUserId(principal.userId());
                    dashboard.setTenantNodeId(tenantNodeId);
                    dashboard.setName(DEFAULT_NAME);
                    dashboard.setLayoutJson(DashboardLayout.empty());
                    return dashboardRepository.save(dashboard);
                });
    }

    private AppUserPrincipal currentPrincipal() {
        return (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
