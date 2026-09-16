package com.corp.iot.backend.metric.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Kiểu đo. {@code tenantId} NULL = dòng hệ thống dùng chung mọi tenant; NOT NULL = chỉ số riêng
 * tenant đó tự thêm.
 *
 * CỐ Ý KHÔNG gắn {@code @TenantId} (ngoại lệ so với CONVENTIONS.md § Backend): DISCRIMINATOR sẽ lọc
 * đúng tenant hiện tại và giấu mất toàn bộ dòng hệ thống. Lọc thủ công qua
 * {@link com.corp.iot.backend.metric.repository.MetricRepository#findVisible}.
 *
 * Không giữ ngưỡng — ngưỡng luôn nằm ở {@code tenant_metric_setting} (xem V26).
 */
@Entity
@Table(name = "metric")
@Getter
@Setter
@NoArgsConstructor
public class Metric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", updatable = false)
    private Long tenantId;

    /** Tag InfluxDB — đổi sau khi tạo sẽ tách series của cùng một kênh làm hai. */
    @Column(nullable = false, updatable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String unit;

    @Column(name = "data_type", nullable = false, updatable = false)
    private String dataType;

    /** Token màu (`chart-1`..`chart-6`/`neutral`). NULL ở dòng hệ thống — màu của chúng nằm ở FE. */
    @Column
    private String color;

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
