package com.corp.iot.backend.gatewaypin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.TenantId;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

// Không có deleted_at ở bảng này (DDL thật) — pin gắn cố định với chân vật lý
// trên hardware, không có API xóa cứng, chỉ create/update (tên, enabled).
@Entity
@Table(name = "gateway_pin")
@Getter
@Setter
@NoArgsConstructor
public class GatewayPin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "gateway_id", nullable = false)
    private Long gatewayId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private PinDirection direction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private PinType type;

    @Column(nullable = false)
    private String name;

    @Column(name = "metric_id")
    private Long metricId;

    @Column(name = "pin_number", nullable = false, updatable = false)
    private Integer pinNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "power_desired_state")
    private PowerState powerDesiredState;

    @Enumerated(EnumType.STRING)
    @Column(name = "power_reported_state")
    private PowerState powerReportedState;

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
}
