package com.corp.iot.backend.common.scope;

import java.util.Set;

public interface ScopeService {

    /**
     * Tập id tenant_node user được truy cập (đã tính cả subtree qua ltree path).
     * null = full access toàn tenant (user có ít nhất 1 UserRoleScope không giới hạn node).
     */
    Set<Long> resolveAccessibleNodeIds(Long tenantId, Long userId);

    boolean canAccessNode(Long tenantId, Long userId, Long nodeId);
}
