package com.corp.iot.backend.tenantnode.service;

import com.corp.iot.backend.tenantnode.dto.CreateTenantNodeRequest;
import com.corp.iot.backend.tenantnode.dto.MoveTenantNodeRequest;
import com.corp.iot.backend.tenantnode.dto.TenantNodeOverviewResponse;
import com.corp.iot.backend.tenantnode.dto.TenantNodeResponse;
import com.corp.iot.backend.tenantnode.dto.UpdateTenantNodeRequest;
import com.corp.iot.backend.tenantnode.dto.UpdateTenantNodeStatusRequest;

import java.util.List;

public interface TenantNodeService {

    List<TenantNodeResponse> list();

    /** Flatten toàn bộ subtree (external_source + SITE) dưới node — dùng cho card-grid Dashboard. */
    TenantNodeOverviewResponse overview(Long id);

    TenantNodeResponse create(CreateTenantNodeRequest request);

    TenantNodeResponse rename(Long id, UpdateTenantNodeRequest request);

    TenantNodeResponse move(Long id, MoveTenantNodeRequest request);

    TenantNodeResponse updateStatus(Long id, UpdateTenantNodeStatusRequest request);

    void delete(Long id);

    /**
     * Tạo TENANT_ROOT cho tenant hiện tại (TenantContext đã set) — chỉ dùng nội bộ
     * bởi TenantServiceImpl.create() ngay sau khi tạo tenant mới.
     */
    TenantNodeResponse createRoot(String name);
}
