package com.corp.iot.ingestion.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Entity riêng của Ingestion Service, chỉ khai field cần dùng để resolve
// mac_address -> gateway_id/tenant_id/tenant_node_id (đọc read-only, không @TenantId
// vì service này cross-tenant, không chạy Hibernate multi-tenancy filter).
@Entity
@Table(name = "gateway")
@Getter
@Setter
@NoArgsConstructor
public class Gateway {

    @Id
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "tenant_node_id")
    private Long tenantNodeId;

    @Column(name = "mac_address", nullable = false)
    private String macAddress;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
