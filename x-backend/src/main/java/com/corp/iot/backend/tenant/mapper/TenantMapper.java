package com.corp.iot.backend.tenant.mapper;

import com.corp.iot.backend.tenant.dto.TenantResponse;
import com.corp.iot.backend.tenant.entity.Tenant;
import org.springframework.stereotype.Component;

@Component
public class TenantMapper {

    public TenantResponse toResponse(Tenant tenant) {
        return new TenantResponse(
                tenant.getId(),
                tenant.getName(),
                tenant.getEmail(),
                tenant.getStatus().name(),
                tenant.getCreatedAt()
        );
    }
}
