package com.corp.iot.backend.externalsource.entity;

import com.corp.iot.backend.externalsource.dto.ExternalSourceConnectionConfig;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.TenantId;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

// tenant_node_id có thể là bất kỳ cấp node nào (khác Gateway chỉ SITE) — xem DATABASE.md
// § external_source. credentialEncrypted lưu AES-GCM ciphertext, không bao giờ decrypt/trả
// ra qua API (chỉ x-ingestion-service decrypt để kết nối thật).
@Entity
@Table(name = "external_source")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
public class ExternalSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "tenant_node_id", nullable = false)
    private Long tenantNodeId;

    @Column(nullable = false)
    private String name;

    @Column(name = "connection_type", nullable = false, updatable = false)
    private String connectionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "connection_config", nullable = false, columnDefinition = "jsonb")
    private ExternalSourceConnectionConfig connectionConfig;

    @Column(name = "credential_encrypted", nullable = false)
    private String credentialEncrypted;

    @Column(name = "last_sync_status")
    private String lastSyncStatus;

    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    @Column(name = "last_error")
    private String lastError;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
