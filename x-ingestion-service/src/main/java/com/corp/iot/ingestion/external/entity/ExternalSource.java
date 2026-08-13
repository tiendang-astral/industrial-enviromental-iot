package com.corp.iot.ingestion.external.entity;

import com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

// Entity riêng của Ingestion Service, chỉ khai field cần để kết nối + resolve tenant
// context (đọc read-only, không @TenantId — cross-tenant, giống entity Gateway ở đây).
@Entity
@Table(name = "external_source")
@Getter
@Setter
@NoArgsConstructor
public class ExternalSource {

    @Id
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "tenant_node_id", nullable = false)
    private Long tenantNodeId;

    @Column(name = "connection_type", nullable = false)
    private String connectionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "connection_config", columnDefinition = "jsonb")
    private ExternalSourceConnectionConfig connectionConfig;

    @Column(name = "credential_encrypted", nullable = false)
    private String credentialEncrypted;

    // Rollup trạng thái đồng bộ — cập nhật sau MỖI lần job con của source này chạy (last-write-
    // wins qua nhiều job), xem ExternalSourceSchedulerService.runJob().
    @Column(name = "last_sync_status")
    private String lastSyncStatus;

    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    @Column(name = "last_error")
    private String lastError;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
