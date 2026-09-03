package com.corp.iot.backend.tenantuser.mapper;

import com.corp.iot.backend.role.entity.TenantRole;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantuser.dto.TenantUserResponse;
import com.corp.iot.backend.tenantuser.dto.UserScopeResponse;
import com.corp.iot.backend.tenantuser.entity.TenantUser;
import com.corp.iot.backend.userrolescope.entity.UserRoleScope;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class TenantUserMapper {

    /**
     * Nhận sẵn map role/node thay vì tự query — service load một lần cho cả danh sách, tránh
     * N+1 khi map vài chục user (mỗi user có thể nhiều scope).
     */
    public TenantUserResponse toResponse(
            TenantUser user,
            List<UserRoleScope> scopes,
            Map<Long, TenantRole> roleById,
            Map<Long, TenantNode> nodeById
    ) {
        return new TenantUserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getStatus().name(),
                user.getCreatedAt(),
                scopes.stream().map(scope -> toScopeResponse(scope, roleById, nodeById)).toList()
        );
    }

    private UserScopeResponse toScopeResponse(
            UserRoleScope scope,
            Map<Long, TenantRole> roleById,
            Map<Long, TenantNode> nodeById
    ) {
        TenantRole role = roleById.get(scope.getRoleId());
        TenantNode node = scope.getTenantNodeId() == null ? null : nodeById.get(scope.getTenantNodeId());
        return new UserScopeResponse(
                scope.getId(),
                scope.getRoleId(),
                role == null ? null : role.getValue(),
                role == null ? null : role.getName(),
                scope.getTenantNodeId(),
                node == null ? null : node.getName()
        );
    }
}
