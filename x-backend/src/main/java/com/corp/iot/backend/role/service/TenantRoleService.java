package com.corp.iot.backend.role.service;

import com.corp.iot.backend.role.dto.TenantRoleResponse;

import java.util.List;

public interface TenantRoleService {

    List<TenantRoleResponse> list();
}
