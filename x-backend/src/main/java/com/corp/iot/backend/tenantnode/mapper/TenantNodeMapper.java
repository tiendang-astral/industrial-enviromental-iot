package com.corp.iot.backend.tenantnode.mapper;

import com.corp.iot.backend.tenantnode.dto.TenantNodeResponse;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import org.springframework.stereotype.Component;

@Component
public class TenantNodeMapper {

    public TenantNodeResponse toResponse(TenantNode node) {
        return new TenantNodeResponse(
                node.getId(),
                node.getParentId(),
                node.getNodeType().name(),
                node.getName(),
                node.getPath(),
                node.getDepth()
        );
    }
}
