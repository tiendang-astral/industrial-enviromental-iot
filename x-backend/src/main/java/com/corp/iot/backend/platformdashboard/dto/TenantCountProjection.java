package com.corp.iot.backend.platformdashboard.dto;

/** Projection dùng chung cho query native "đếm theo tenant_id" (tenant_user, gateway, external_source). */
public interface TenantCountProjection {
    Long getTenantId();
    Long getCnt();
}
