package com.corp.iot.backend.externalsourcejob.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.TenantId;

import java.time.Instant;

// Tác vụ vá lịch sử cho 1 kênh dữ liệu (V13). x-backend tạo ở trạng thái PENDING,
// x-ingestion-service nhặt lên chạy và cập nhật tiến độ — xem ARCHITECTURE.md
// § Flow: External source backfill.
@Entity
@Table(name = "external_source_job_backfill")
@Getter
@Setter
@NoArgsConstructor
public class ExternalSourceJobBackfill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "external_source_job_id", nullable = false, updatable = false)
    private Long externalSourceJobId;

    @Column(name = "datastream_id", nullable = false, updatable = false)
    private Long datastreamId;

    // Dải cần vá = [targetFrom, coveredFrom], cả hai cố định suốt tác vụ.
    @Column(name = "target_from", nullable = false, updatable = false)
    private Instant targetFrom;

    @Column(name = "covered_from", nullable = false, updatable = false)
    private Instant coveredFrom;

    // Đang lùi tới đâu trong dải đó — đọc mới → cũ để dữ liệu luôn liền mạch.
    @Column(name = "cursor_at", nullable = false)
    private Instant cursorAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BackfillStatus status;

    @Column(name = "row_count", nullable = false)
    private long rowCount;

    @Column(name = "error")
    private String error;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
