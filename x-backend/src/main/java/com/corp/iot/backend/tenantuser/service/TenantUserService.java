package com.corp.iot.backend.tenantuser.service;

import com.corp.iot.backend.tenantuser.dto.CreateTenantUserRequest;
import com.corp.iot.backend.tenantuser.dto.ResetTenantUserPasswordRequest;
import com.corp.iot.backend.tenantuser.dto.TenantUserResponse;
import com.corp.iot.backend.tenantuser.dto.UpdateTenantUserRequest;
import com.corp.iot.backend.tenantuser.dto.UpdateTenantUserStatusRequest;

import java.util.List;

public interface TenantUserService {

    List<TenantUserResponse> list();

    TenantUserResponse create(CreateTenantUserRequest request);

    TenantUserResponse update(Long id, UpdateTenantUserRequest request);

    TenantUserResponse updateStatus(Long id, UpdateTenantUserStatusRequest request, Long currentUserId);

    void resetPassword(Long id, ResetTenantUserPasswordRequest request);

    void delete(Long id, Long currentUserId);
}
