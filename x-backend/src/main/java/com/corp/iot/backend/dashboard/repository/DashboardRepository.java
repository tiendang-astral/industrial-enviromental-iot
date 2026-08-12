package com.corp.iot.backend.dashboard.repository;

import com.corp.iot.backend.dashboard.entity.Dashboard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DashboardRepository extends JpaRepository<Dashboard, Long> {

    Optional<Dashboard> findByUserIdAndTenantNodeId(Long userId, Long tenantNodeId);
}
