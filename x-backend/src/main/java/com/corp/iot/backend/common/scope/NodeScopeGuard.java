package com.corp.iot.backend.common.scope;

import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.gateway.repository.GatewayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Bean SpEL dùng trong {@code @PreAuthorize("@nodeScope.canAccess(#id)")} ở
 * controller cần kiểm tra quyền theo tenant_node cụ thể (khác role-based thuần
 * hasAuthority(...) ở Tenant/PlatformUser Phase 1).
 */
@Component("nodeScope")
@RequiredArgsConstructor
public class NodeScopeGuard {

    private final ScopeService scopeService;
    private final GatewayRepository gatewayRepository;
    private final DatastreamRepository datastreamRepository;

    public boolean canAccess(Long tenantNodeId) {
        if (tenantNodeId == null) {
            return false;
        }
        AppUserPrincipal principal = currentPrincipal();
        return scopeService.canAccessNode(principal.tenantId(), principal.userId(), tenantNodeId);
    }

    public boolean canAccessGateway(Long gatewayId) {
        if (gatewayId == null) {
            return false;
        }
        return gatewayRepository.findById(gatewayId)
                .map(gateway -> canAccess(gateway.getTenantNodeId()))
                .orElse(false);
    }

    public boolean canAccessDatastream(Long datastreamId) {
        if (datastreamId == null) {
            return false;
        }
        return datastreamRepository.findById(datastreamId)
                .map(datastream -> canAccess(datastream.getTenantNodeId()))
                .orElse(false);
    }

    private AppUserPrincipal currentPrincipal() {
        return (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
