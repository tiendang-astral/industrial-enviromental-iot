package com.corp.iot.backend.dashboard.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.dashboard.dto.DashboardLayout;
import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboard.dto.UpdateDashboardRequest;
import com.corp.iot.backend.dashboard.entity.Dashboard;
import com.corp.iot.backend.dashboard.mapper.DashboardMapper;
import com.corp.iot.backend.dashboard.repository.DashboardRepository;
import com.corp.iot.backend.externalsource.entity.ExternalSource;
import com.corp.iot.backend.externalsource.repository.ExternalSourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private static final String DEFAULT_NAME = "Dashboard";

    private final DashboardRepository dashboardRepository;
    private final ExternalSourceRepository externalSourceRepository;
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
        return dashboardRepository.findByUserIdAndTenantNodeIdAndExternalSourceIdIsNull(principal.userId(), tenantNodeId)
                .orElseGet(() -> {
                    Dashboard dashboard = new Dashboard();
                    dashboard.setUserId(principal.userId());
                    dashboard.setTenantNodeId(tenantNodeId);
                    dashboard.setName(DEFAULT_NAME);
                    dashboard.setLayoutJson(DashboardLayout.empty());
                    return dashboardRepository.save(dashboard);
                });
    }

    @Override
    @Transactional
    public DashboardResponse getOrCreateForSource(Long externalSourceId) {
        return dashboardMapper.toResponse(getOrCreateEntityForSource(externalSourceId));
    }

    @Override
    @Transactional
    public DashboardResponse saveForSource(Long externalSourceId, UpdateDashboardRequest request) {
        Dashboard dashboard = getOrCreateEntityForSource(externalSourceId);
        dashboard.setLayoutJson(request.layoutJson());
        dashboardRepository.save(dashboard);
        return dashboardMapper.toResponse(dashboard);
    }

    private Dashboard getOrCreateEntityForSource(Long externalSourceId) {
        AppUserPrincipal principal = currentPrincipal();
        return dashboardRepository.findByUserIdAndExternalSourceId(principal.userId(), externalSourceId)
                .orElseGet(() -> {
                    ExternalSource source = externalSourceRepository.findById(externalSourceId)
                            .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "SOURCE_NOT_FOUND", "Không tìm thấy nguồn dữ liệu"));
                    Dashboard dashboard = new Dashboard();
                    dashboard.setUserId(principal.userId());
                    dashboard.setTenantNodeId(source.getTenantNodeId());
                    dashboard.setExternalSourceId(externalSourceId);
                    dashboard.setName(DEFAULT_NAME);
                    dashboard.setLayoutJson(DashboardLayout.empty());
                    return dashboardRepository.save(dashboard);
                });
    }

    private AppUserPrincipal currentPrincipal() {
        return (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
