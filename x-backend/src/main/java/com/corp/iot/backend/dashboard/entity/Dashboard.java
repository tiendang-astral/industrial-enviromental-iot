package com.corp.iot.backend.dashboard.entity;

import com.corp.iot.backend.dashboard.dto.DashboardLayout;
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

// Mỗi user tối đa 1 board/node (uq_dashboard_user_node) — get-or-create ở DashboardServiceImpl,
// không có endpoint tạo riêng.
@Entity
@Table(name = "dashboard")
@Getter
@Setter
@NoArgsConstructor
public class Dashboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(name = "tenant_node_id", updatable = false)
    private Long tenantNodeId;

    // NOT NULL = board riêng theo 1 nguồn (layout riêng) — V11, xem DATABASE.md § dashboard.
    // tenantNodeId vẫn set = node của nguồn đó (denormalize để tái dùng @nodeScope.canAccess).
    @Column(name = "external_source_id", updatable = false)
    private Long externalSourceId;

    @Column(nullable = false)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "layout_json", nullable = false, columnDefinition = "jsonb")
    private DashboardLayout layoutJson = DashboardLayout.empty();

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
}
