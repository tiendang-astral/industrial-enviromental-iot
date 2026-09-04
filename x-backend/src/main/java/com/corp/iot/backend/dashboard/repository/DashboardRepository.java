package com.corp.iot.backend.dashboard.repository;

import com.corp.iot.backend.dashboard.entity.Dashboard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DashboardRepository extends JpaRepository<Dashboard, Long> {

    /**
     * Board theo node — bắt buộc lọc `external_source_id IS NULL`. Board theo nguồn denormalize
     * `tenant_node_id` = node của nguồn (xem DATABASE.md § dashboard), nên cùng một node có thể có
     * 1 board node + N board nguồn; thiếu điều kiện này thì Optional nhận nhiều dòng và ném
     * NonUniqueResultException. Unique index `uq_dashboard_user_node` vốn đã phân biệt bằng
     * COALESCE(external_source_id, 0).
     */
    Optional<Dashboard> findByUserIdAndTenantNodeIdAndExternalSourceIdIsNull(Long userId, Long tenantNodeId);

    Optional<Dashboard> findByUserIdAndExternalSourceId(Long userId, Long externalSourceId);
}
