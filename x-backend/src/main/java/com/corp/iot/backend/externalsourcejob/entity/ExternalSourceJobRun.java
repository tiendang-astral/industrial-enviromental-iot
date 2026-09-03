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

// Bảng log một dòng/lần chạy (V12) — external_source_job chỉ giữ được lần chạy gần nhất, không
// dựng được dải nhịp chạy hay biểu đồ số dòng theo giờ. x-ingestion-service ghi, x-backend đọc.
@Entity
@Table(name = "external_source_job_run")
@Getter
@Setter
@NoArgsConstructor
public class ExternalSourceJobRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "external_source_job_id", nullable = false, updatable = false)
    private Long externalSourceJobId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobRunStatus status;

    @Column(name = "row_count", nullable = false)
    private long rowCount;

    @Column(name = "error")
    private String error;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
