package com.corp.iot.backend.tenantuser.dto;

public record UserScopeResponse(
        Long id,
        Long roleId,
        String roleValue,
        String roleName,
        Long tenantNodeId,
        String tenantNodeName
) {
}
