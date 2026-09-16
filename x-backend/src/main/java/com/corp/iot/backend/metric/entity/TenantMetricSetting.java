package com.corp.iot.backend.metric.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.TenantId;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Ngưỡng riêng của một tenant cho một chỉ số. Có dòng = đã đặt ngưỡng; xoá dòng = về trống
 * (không cần cờ hay giá trị sentinel, vì bảng metric không giữ mặc định nào).
 */
@Entity
@Table(name = "tenant_metric_setting")
@Getter
@Setter
@NoArgsConstructor
public class TenantMetricSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "metric_id", nullable = false, updatable = false)
    private Long metricId;

    @Column(name = "min_value", nullable = false)
    private Double minValue;

    @Column(name = "max_value", nullable = false)
    private Double maxValue;

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
