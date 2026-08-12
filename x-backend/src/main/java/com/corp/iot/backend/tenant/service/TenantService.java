package com.corp.iot.backend.tenant.service;

import com.corp.iot.backend.tenant.dto.CreateTenantRequest;
import com.corp.iot.backend.tenant.dto.TenantResponse;

import java.util.List;

public interface TenantService {

    TenantResponse create(CreateTenantRequest request);

    List<TenantResponse> list();
}
