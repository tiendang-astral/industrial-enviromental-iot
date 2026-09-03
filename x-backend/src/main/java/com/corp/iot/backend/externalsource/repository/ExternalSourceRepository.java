package com.corp.iot.backend.externalsource.repository;

import com.corp.iot.backend.externalsource.entity.ExternalSource;
import com.corp.iot.backend.platformdashboard.dto.TenantCountProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface ExternalSourceRepository extends JpaRepository<ExternalSource, Long> {

    List<ExternalSource> findByTenantNodeId(Long tenantNodeId);

    List<ExternalSource> findByTenantNodeIdIn(Collection<Long> tenantNodeIds);

    /** Cross-tenant cho Platform Dashboard — bypass @TenantId, cùng lý do các repo khác. */
    @Query(value = "SELECT count(*) FROM external_source WHERE deleted_at IS NULL", nativeQuery = true)
    long countAllActiveNative();

    @Query(value = "SELECT tenant_id AS tenantId, count(*) AS cnt " +
            "FROM external_source WHERE deleted_at IS NULL GROUP BY tenant_id", nativeQuery = true)
    List<TenantCountProjection> dataSourceCountsByTenantNative();
}
