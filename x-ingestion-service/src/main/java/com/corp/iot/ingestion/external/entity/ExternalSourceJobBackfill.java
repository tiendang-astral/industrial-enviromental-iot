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

// Entity riêng của Ingestion Service (V13). x-backend tạo tác vụ ở trạng thái PENDING, service
// này nhặt lên chạy và cập nhật tiến độ — xem ExternalBackfillService.
@Entity
@Table(name = "external_source_job_backfill")
@Getter
@Setter
@NoArgsConstructor
public class ExternalSourceJobBackfill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "external_source_job_id", nullable = false)
    private Long externalSourceJobId;

    @Column(name = "datastream_id", nullable = false)
    private Long datastreamId;

    @Column(name = "target_from", nullable = false)
    private Instant targetFrom;

    @Column(name = "covered_from", nullable = false)
    private Instant coveredFrom;

    @Column(name = "cursor_at", nullable = false)
    private Instant cursorAt;

    @Column(nullable = false)
    private String status;

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
}
