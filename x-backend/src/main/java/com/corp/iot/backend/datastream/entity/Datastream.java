package com.corp.iot.backend.datastream.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.TenantId;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

// Tự động tạo 1-1 khi tạo gateway_pin INPUT (GatewayPinServiceImpl.create()) — không có
// endpoint tạo/xóa riêng, không bị xóa khi pin bị tắt (xem DATABASE.md § datastream).
@Entity
@Table(name = "datastream")
@Getter
@Setter
@NoArgsConstructor
public class Datastream {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "tenant_node_id", nullable = false, updatable = false)
    private Long tenantNodeId;

    @Column(nullable = false)
    private String name;

    @Column(name = "metric_id", nullable = false, updatable = false)
    private Long metricId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, updatable = false)
    private SourceType sourceType;

    @Column(name = "source_id", nullable = false, updatable = false)
    private Long sourceId;

    // Chỉ có giá trị khi sourceType=EXTERNAL_SOURCE_JOB (CHECK ck_datastream_source_field,
    // V11) — field trong query_config.valueColumns mà datastream này bind vào.
    @Column(name = "source_field", updatable = false)
    private String sourceField;

    // Mốc sớm nhất kênh có số đo liền mạch — dữ liệu là dải [oldestReadingAt → nay] (V13).
    // Backfill nới dải này sang trái sau mỗi lô, nên ngắt giữa chừng chỉ làm dải ngắn đi.
    // NULL với GATEWAY_PIN: chỉ external mới có khái niệm đọc lại lịch sử.
    @Column(name = "oldest_reading_at")
    private Instant oldestReadingAt;

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
