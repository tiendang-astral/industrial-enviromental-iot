package com.corp.iot.backend.command.entity;

import com.corp.iot.backend.command.dto.CommandParameters;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.TenantId;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

// Chỉ khai field Backend thực sự cần (ghi lúc tạo lệnh) — dispatched_at/acknowledged_at/
// completed_at/ack_payload_json/retry_count/correlation_id do Processing Service cập nhật,
// Backend không đọc lại (không có endpoint GET/list command ở Phase 7, xem PLAN.md).
@Entity
@Table(name = "command")
@Getter
@Setter
@NoArgsConstructor
public class Command {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "gateway_id", nullable = false, updatable = false)
    private Long gatewayId;

    @Column(name = "tenant_node_id", updatable = false)
    private Long tenantNodeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "command_type", nullable = false, updatable = false)
    private CommandType commandType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "parameters_json", nullable = false, updatable = false, columnDefinition = "jsonb")
    private CommandParameters parametersJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommandStatus status;

    @Column(name = "requested_by", nullable = false, updatable = false)
    private Long requestedBy;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private Instant requestedAt;

    @Column(name = "timeout_at", nullable = false, updatable = false)
    private Instant timeoutAt;

    @Column(name = "idempotency_key", updatable = false)
    private String idempotencyKey;

    @Column
    private String error;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
