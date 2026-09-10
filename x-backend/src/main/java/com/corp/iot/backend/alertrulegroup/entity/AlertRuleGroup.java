package com.corp.iot.backend.alertrulegroup.entity;

import com.corp.iot.backend.alertrule.entity.AlertSeverity;
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
 * Ý định của người dùng: "theo dõi các chỉ số này ở các đơn vị này". Engine lại cần mỗi
 * {@code alert_rule} gắn đúng 1 node + 1 metric để resolve cho rẻ — nhóm giữ ý định, rule con giữ
 * dạng đã trải phẳng. Engine không biết nhóm tồn tại.
 */
@Entity
@Table(name = "alert_rule_group")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
public class AlertRuleGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity severity;

    /** NULL = mọi loại nguồn. Chép xuống mọi rule con, giống `severity`. */
    @Enumerated(EnumType.STRING)
    @Column(name = "source_type")
    private SourceType sourceType;

    /**
     * Phạm vi đích danh; NULL = không giới hạn. Mỗi danh sách chỉ có nghĩa với đúng loại của nó,
     * {@code ck_alert_rule_group_scope} chặn phần còn lại.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "gateway_ids", columnDefinition = "jsonb")
    private List<Long> gatewayIds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "external_source_ids", columnDefinition = "jsonb")
    private List<Long> externalSourceIds;

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
