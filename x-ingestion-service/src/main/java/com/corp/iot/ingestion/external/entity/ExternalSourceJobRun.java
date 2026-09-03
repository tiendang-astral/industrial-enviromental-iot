package com.corp.iot.ingestion.external.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Entity riêng của Ingestion Service — chỉ ghi, không đọc. x-backend đọc bảng này cho dải nhịp
// chạy và biểu đồ số dòng ở trang chi tiết nguồn (V12).
@Entity
@Table(name = "external_source_job_run")
@Getter
@Setter
@NoArgsConstructor
public class ExternalSourceJobRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "external_source_job_id", nullable = false)
    private Long externalSourceJobId;

    @Column(nullable = false)
    private String status;

    @Column(name = "row_count", nullable = false)
    private long rowCount;

    @Column(name = "error")
    private String error;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;
}
