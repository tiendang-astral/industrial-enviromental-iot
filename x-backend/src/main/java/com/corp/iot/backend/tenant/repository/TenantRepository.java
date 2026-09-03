package com.corp.iot.backend.tenant.repository;

import com.corp.iot.backend.platformdashboard.dto.DailyCountProjection;
import com.corp.iot.backend.tenant.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface TenantRepository extends JpaRepository<Tenant, Long> {

    List<Tenant> findAllByOrderByNameAsc();

    // Tenant không có @TenantId (self-referencing platform context) nên count() chuẩn đã
    // cross-tenant sẵn — 2 query dưới đây chỉ cần cho time-series của Platform Dashboard.
    @Query(value = "SELECT count(*) FROM tenant WHERE created_at < :before", nativeQuery = true)
    long countCreatedBeforeNative(@Param("before") Instant before);

    @Query(value = "SELECT (date_trunc('day', created_at))::date AS day, count(*) AS cnt " +
            "FROM tenant WHERE created_at >= :from " +
            "GROUP BY day ORDER BY day", nativeQuery = true)
    List<DailyCountProjection> countNewSinceNative(@Param("from") Instant from);
}
