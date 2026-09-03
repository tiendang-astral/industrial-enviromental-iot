package com.corp.iot.backend.tenantuser.dto;

import jakarta.validation.constraints.NotNull;

/** `tenantNodeId` null = full-access toàn tenant (đúng ngữ nghĩa cột `user_role_scope.tenant_node_id`). */
public record UserScopeRequest(
        @NotNull Long roleId,
        Long tenantNodeId
) {
}
