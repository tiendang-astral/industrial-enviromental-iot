package com.corp.iot.processing.entity;

import com.corp.iot.processing.dto.AlertConditionGroup;
import jakarta.persistence.Column;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;


// Entity riêng của Processing Service — chỉ đọc, x-backend là nơi ghi cấu hình rule.
@Entity
@Table(name = "alert_rule")
@Getter
@Setter
@NoArgsConstructor
public class AlertRule {

    @Id
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "tenant_node_id", nullable = false)
    private Long tenantNodeId;

    @Column(nullable = false)
    private String name;

    @Column(name = "metric_id", nullable = false)
    private Long metricId;

    /** NULL = áp cho mọi loại nguồn (hành vi trước `V18`). */
    @Enumerated(EnumType.STRING)
    @Column(name = "source_type")
    private SourceType sourceType;

    /** Phạm vi đích danh (`V24`); NULL = không giới hạn, tức quy tắc tạo trước bản đó. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "gateway_ids", columnDefinition = "jsonb")
    private List<Long> gatewayIds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "external_source_ids", columnDefinition = "jsonb")
    private List<Long> externalSourceIds;

    @Column(nullable = false)
    private String severity;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "conditions_json", nullable = false, columnDefinition = "jsonb")
    private AlertConditionGroup conditions;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(nullable = false)
    private boolean enabled;
}
