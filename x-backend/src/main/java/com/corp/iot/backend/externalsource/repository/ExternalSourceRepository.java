package com.corp.iot.backend.externalsource.repository;

import com.corp.iot.backend.externalsource.entity.ExternalSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ExternalSourceRepository extends JpaRepository<ExternalSource, Long> {

    List<ExternalSource> findByTenantNodeId(Long tenantNodeId);

    List<ExternalSource> findByTenantNodeIdIn(Collection<Long> tenantNodeIds);
}
