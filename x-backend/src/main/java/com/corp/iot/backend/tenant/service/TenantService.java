package com.corp.iot.backend.tenant.service;

import com.corp.iot.backend.tenant.dto.CreateTenantRequest;
import com.corp.iot.backend.tenant.dto.TenantDetailResponse;
import com.corp.iot.backend.tenant.dto.TenantResponse;
import com.corp.iot.backend.tenant.dto.UpdateTenantStatusRequest;

import java.util.List;

public interface TenantService {

    TenantResponse create(CreateTenantRequest request);

    List<TenantResponse> list();

    TenantDetailResponse detail(Long id);

    TenantResponse updateStatus(Long id, UpdateTenantStatusRequest request);
}
