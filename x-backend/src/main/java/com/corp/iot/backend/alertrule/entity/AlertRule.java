package com.corp.iot.backend.alertrule.entity;

import com.corp.iot.backend.alertrule.dto.AlertConditionGroup;
import com.corp.iot.backend.datastream.entity.SourceType;
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
import java.util.List;

/**
 * Rule cảnh báo theo metric tại một node. Rule ở node cha phủ toàn bộ subtree bên dưới —
 * việc resolve nằm ở x-processing-service (xem ARCHITECTURE.md § Flow: Alert).
 */
@Entity
@Table(name = "alert_rule")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
public class AlertRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "tenant_node_id", nullable = false)
    private Long tenantNodeId;

    /** NULL = rule đứng một mình (tạo qua endpoint rule đơn lẻ), vẫn hợp lệ với engine. */
    @Column(name = "group_id")
    private Long groupId;

    @Column(nullable = false)
    private String name;

    @Column(name = "metric_id", nullable = false)
    private Long metricId;

    /** NULL = áp cho mọi loại nguồn — đúng bằng hành vi trước `V18`. */
    @Enumerated(EnumType.STRING)
    @Column(name = "source_type")
    private SourceType sourceType;

    /** Chép từ nhóm. NULL = không giới hạn — engine đọc thẳng cột này, không biết nhóm tồn tại. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "gateway_ids", columnDefinition = "jsonb")
    private List<Long> gatewayIds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "external_source_ids", columnDefinition = "jsonb")
    private List<Long> externalSourceIds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity severity;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "conditions_json", nullable = false, columnDefinition = "jsonb")
    private AlertConditionGroup conditions;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(nullable = false)
    private boolean enabled = true;

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
