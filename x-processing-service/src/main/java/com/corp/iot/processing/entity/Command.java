package com.corp.iot.processing.entity;

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
import java.util.UUID;

// Entity riêng của Processing Service — row do x-backend insert (status=PENDING), Processing
// Service chỉ đọc rồi cập nhật tiếp status/dispatched_at/acknowledged_at/retry_count/error
// qua các bước dispatch/ACK/timeout (xem ARCHITECTURE.md § Flow: Command / Relay control).
@Entity
@Table(name = "command")
@Getter
@Setter
@NoArgsConstructor
public class Command {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "gateway_id", nullable = false)
    private Long gatewayId;

    @Column(name = "tenant_node_id")
    private Long tenantNodeId;

    @Column(nullable = false)
    private String status;

    @Column(name = "timeout_at", nullable = false)
    private Instant timeoutAt;

    @Column(name = "dispatched_at")
    private Instant dispatchedAt;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ack_payload_json", columnDefinition = "jsonb")
    private Object ackPayloadJson;

    private String error;
}
