package com.corp.iot.backend.datastream.repository;

import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.entity.SourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface DatastreamRepository extends JpaRepository<Datastream, Long> {

    List<Datastream> findByTenantNodeId(Long tenantNodeId);

    List<Datastream> findByTenantNodeIdAndMetricId(Long tenantNodeId, Long metricId);

    List<Datastream> findByTenantNodeIdInAndMetricId(Collection<Long> tenantNodeIds, Long metricId);

    boolean existsBySourceTypeAndSourceId(SourceType sourceType, Long sourceId);

    boolean existsBySourceTypeAndSourceIdAndSourceField(SourceType sourceType, Long sourceId, String sourceField);

    /**
     * Datastream thuộc 1 external_source (qua job) — join external_source_job vì
     * datastream.source_id = job.id, không phải source.id trực tiếp (xem DATABASE.md
     * § datastream). Dùng cho dialog "Thêm widget" ở dashboard theo nguồn.
     */
    @Query("""
            SELECT d FROM Datastream d, ExternalSourceJob j
            WHERE d.sourceType = com.corp.iot.backend.datastream.entity.SourceType.EXTERNAL_SOURCE_JOB
              AND d.sourceId = j.id
              AND j.externalSourceId = :externalSourceId
            """)
    List<Datastream> findByExternalSourceId(@Param("externalSourceId") Long externalSourceId);
}
