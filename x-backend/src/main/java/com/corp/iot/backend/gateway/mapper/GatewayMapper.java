package com.corp.iot.backend.gateway.mapper;

import com.corp.iot.backend.gateway.dto.GatewayResponse;
import com.corp.iot.backend.gateway.entity.Gateway;
import org.springframework.stereotype.Component;

@Component
public class GatewayMapper {

    public GatewayResponse toResponse(Gateway gateway) {
        return new GatewayResponse(
                gateway.getId(),
                gateway.getTenantNodeId(),
                gateway.getName(),
                gateway.getMacAddress(),
                gateway.getLastSeenAt()
        );
    }
}
