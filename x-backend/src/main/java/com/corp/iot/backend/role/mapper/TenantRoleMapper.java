package com.corp.iot.backend.role.mapper;

import com.corp.iot.backend.role.dto.TenantRoleResponse;
import com.corp.iot.backend.role.entity.TenantRole;
import org.springframework.stereotype.Component;

@Component
public class TenantRoleMapper {

    public TenantRoleResponse toResponse(TenantRole role) {
        return new TenantRoleResponse(role.getId(), role.getName(), role.getValue());
    }
}
