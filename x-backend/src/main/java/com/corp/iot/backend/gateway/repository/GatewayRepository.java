package com.corp.iot.backend.gateway.repository;

import com.corp.iot.backend.gateway.entity.Gateway;
import com.corp.iot.backend.platformdashboard.dto.TenantCountProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface GatewayRepository extends JpaRepository<Gateway, Long> {

    boolean existsByTenantNodeId(Long tenantNodeId);

    List<Gateway> findByTenantNodeId(Long tenantNodeId);

    List<Gateway> findByTenantNodeIdIn(Collection<Long> tenantNodeIds);

    /**
     * mac_address unique TOÀN PLATFORM (không theo tenant) — phải dùng native query
     * để bypass @TenantId, vì Hibernate tự thêm "AND tenant_id = ?" cho mọi query
     * entity-managed, sẽ bỏ sót MAC trùng ở tenant khác.
     */
    @Query(value = "SELECT count(*) > 0 FROM gateway WHERE lower(mac_address) = lower(:mac)", nativeQuery = true)
    boolean macAddressExistsPlatformWide(@Param("mac") String mac);

    /** Giống macAddressExistsPlatformWide nhưng loại trừ chính gateway đang sửa (update MAC). */
    @Query(value = "SELECT count(*) > 0 FROM gateway WHERE lower(mac_address) = lower(:mac) AND id != :id", nativeQuery = true)
    boolean macAddressExistsPlatformWideExcludingId(@Param("mac") String mac, @Param("id") Long id);

    /** Tổng thiết bị toàn platform cho Platform Dashboard — cross-tenant, cùng lý do bypass @TenantId ở trên. */
    @Query(value = "SELECT count(*) FROM gateway WHERE deleted_at IS NULL", nativeQuery = true)
    long countAllActiveNative();

    @Query(value = "SELECT tenant_id AS tenantId, count(*) AS cnt " +
            "FROM gateway WHERE deleted_at IS NULL GROUP BY tenant_id", nativeQuery = true)
    List<TenantCountProjection> deviceCountsByTenantNative();
}
