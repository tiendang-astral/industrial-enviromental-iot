package com.corp.iot.backend.datastream.repository;

import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.entity.SourceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DatastreamRepository extends JpaRepository<Datastream, Long> {

    List<Datastream> findByTenantNodeId(Long tenantNodeId);

    List<Datastream> findByTenantNodeIdAndMetricId(Long tenantNodeId, Long metricId);

    boolean existsBySourceTypeAndSourceId(SourceType sourceType, Long sourceId);
}
