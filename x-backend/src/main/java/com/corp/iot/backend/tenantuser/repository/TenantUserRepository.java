package com.corp.iot.backend.tenantuser.repository;

import com.corp.iot.backend.platformdashboard.dto.DailyCountProjection;
import com.corp.iot.backend.platformdashboard.dto.TenantCountProjection;
import com.corp.iot.backend.tenantuser.entity.TenantUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface TenantUserRepository extends JpaRepository<TenantUser, Long> {

    Optional<TenantUser> findByUsernameIgnoreCase(String username);

    List<TenantUser> findAllByOrderByUsernameAsc();

    /*
     * uq_tenant_user_username / uq_tenant_user_email là unique TOÀN PLATFORM và KHÔNG partial theo
     * deleted_at (khác platform_user từ V9) — user đã xoá mềm vẫn giữ chỗ username/email. Vì vậy
     * phải kiểm tra bằng native query, đếm cả bản ghi đã xoá: query entity-managed vừa bị @TenantId
     * giới hạn trong 1 tenant, vừa bị @SQLRestriction lọc mất bản ghi đã xoá, nên không thấy được
     * xung đột thật và sẽ để DB ném DataIntegrityViolation ở tầng dưới.
     */
    @Query(value = "SELECT count(*) > 0 FROM tenant_user WHERE lower(username) = lower(:username)", nativeQuery = true)
    boolean usernameExistsPlatformWide(@Param("username") String username);

    @Query(value = "SELECT count(*) > 0 FROM tenant_user WHERE lower(email) = lower(:email) AND (:excludeId IS NULL OR id <> :excludeId)", nativeQuery = true)
    boolean emailExistsPlatformWide(@Param("email") String email, @Param("excludeId") Long excludeId);

    /**
     * Đếm cross-tenant cho Platform Dashboard — bắt buộc native query để bypass @TenantId,
     * giống pattern GatewayRepository.macAddressExistsPlatformWide (Hibernate tự thêm
     * "AND tenant_id = ?" cho mọi query entity-managed, System Admin không có tenant_id).
     */
    @Query(value = "SELECT count(*) FROM tenant_user WHERE deleted_at IS NULL", nativeQuery = true)
    long countAllActiveNative();

    @Query(value = "SELECT count(*) FROM tenant_user WHERE deleted_at IS NULL AND created_at < :before", nativeQuery = true)
    long countActiveCreatedBeforeNative(@Param("before") Instant before);

    @Query(value = "SELECT (date_trunc('day', created_at))::date AS day, count(*) AS cnt " +
            "FROM tenant_user WHERE deleted_at IS NULL AND created_at >= :from " +
            "GROUP BY day ORDER BY day", nativeQuery = true)
    List<DailyCountProjection> countActiveNewSinceNative(@Param("from") Instant from);

    @Query(value = "SELECT tenant_id AS tenantId, count(*) AS cnt " +
            "FROM tenant_user WHERE deleted_at IS NULL GROUP BY tenant_id", nativeQuery = true)
    List<TenantCountProjection> userCountsByTenantNative();
}
