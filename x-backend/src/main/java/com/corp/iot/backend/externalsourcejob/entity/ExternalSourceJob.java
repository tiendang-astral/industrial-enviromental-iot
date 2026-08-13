package com.corp.iot.backend.externalsourcejob.entity;

import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceFilter;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceQueryConfig;
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

// mapping_config (cột có trong DB từ baseline) KHÔNG map ở đây — field->metric mapping thật
// nằm ở datastream.source_field/metric_id (xem DATABASE.md § external_source_job), cột này
// reserved/unused. incremental_field cũng không map — thay bằng queryConfig.timestampColumn.
@Entity
@Table(name = "external_source_job")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
public class ExternalSourceJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "external_source_id", nullable = false, updatable = false)
    private Long externalSourceId;

    @Column(nullable = false)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "query_config", nullable = false, columnDefinition = "jsonb")
    private ExternalSourceQueryConfig queryConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "filter_config", columnDefinition = "jsonb")
    private List<ExternalSourceFilter> filterConfig;

    @Column(name = "schedule_cron", nullable = false)
    private String scheduleCron;

    @Column(name = "incremental_cursor")
    private String incrementalCursor;

    @Column(name = "total_row_count", nullable = false)
    private long totalRowCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_run_status")
    private JobRunStatus lastRunStatus;

    @Column(name = "last_run_at")
    private Instant lastRunAt;

    @Column(name = "next_run_at")
    private Instant nextRunAt;

    @Column(name = "last_error")
    private String lastError;

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
