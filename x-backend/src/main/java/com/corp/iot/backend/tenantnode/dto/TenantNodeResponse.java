package com.corp.iot.backend.tenantnode.dto;

public record TenantNodeResponse(
        Long id,
        Long parentId,
        String nodeType,
        String name,
        String path,
        int depth
) {
}
