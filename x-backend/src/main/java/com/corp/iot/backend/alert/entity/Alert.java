package com.corp.iot.backend.alert.entity;

import com.corp.iot.backend.alertrule.dto.AlertConditionGroup;
import com.corp.iot.backend.alertrule.entity.AlertSeverity;
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

/**
 * Instance cảnh báo — bảng state machine (không soft delete). x-backend chỉ ĐỌC:
 * mọi chuyển trạng thái do x-processing-service ghi.
 */
@Entity
@Table(name = "alert")
@Getter
@Setter
@NoArgsConstructor
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "rule_id", nullable = false)
    private Long ruleId;

    @Column(name = "tenant_node_id", nullable = false)
    private Long tenantNodeId;

    @Column(name = "datastream_id")
    private Long datastreamId;

    @Column(nullable = false)
    private String fingerprint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity severity;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "triggered_at")
    private Instant triggeredAt;

    @Column(name = "recovered_at")
    private Instant recoveredAt;

    @Column(name = "last_observed_at")
    private Instant lastObservedAt;

    @Column(name = "last_observed_value")
    private Double lastObservedValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "threshold_snapshot_json", columnDefinition = "jsonb")
    private AlertConditionGroup thresholdSnapshot;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
