package com.corp.iot.ingestion.external.entity;

import com.corp.iot.ingestion.external.dto.ExternalSourceQueryConfig;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

// Entity riêng của Ingestion Service — chỉ khai field cần cho scheduler + query executor
// (xem ExternalSourceSchedulerService, ExternalQueryExecutorService).
@Entity
@Table(name = "external_source_job")
@Getter
@Setter
@NoArgsConstructor
public class ExternalSourceJob {

    @Id
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "external_source_id", nullable = false)
    private Long externalSourceId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "query_config", columnDefinition = "jsonb")
    private ExternalSourceQueryConfig queryConfig;

    @Column(name = "schedule_cron", nullable = false)
    private String scheduleCron;

    @Column(name = "incremental_cursor")
    private String incrementalCursor;

    @Column(name = "total_row_count", nullable = false)
    private long totalRowCount;

    @Column(name = "last_run_status")
    private String lastRunStatus;

    @Column(name = "last_run_at")
    private Instant lastRunAt;

    @Column(name = "next_run_at")
    private Instant nextRunAt;

    @Column(name = "last_error")
    private String lastError;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
