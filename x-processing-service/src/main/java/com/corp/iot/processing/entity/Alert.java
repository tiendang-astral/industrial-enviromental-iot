package com.corp.iot.processing.entity;

import com.corp.iot.processing.dto.AlertConditionGroup;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

// Bảng state machine PENDING -> ACTIVE -> RECOVERED. Processing Service là nơi DUY NHẤT ghi
// (x-backend chỉ đọc để hiển thị) — xem ARCHITECTURE.md § Flow: Alert.
@Entity
@Table(name = "alert")
@Getter
@Setter
@NoArgsConstructor
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "rule_id", nullable = false)
    private Long ruleId;

    @Column(name = "tenant_node_id", nullable = false)
    private Long tenantNodeId;

    @Column(name = "datastream_id")
    private Long datastreamId;

    @Column(nullable = false)
    private String fingerprint;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String severity;

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
