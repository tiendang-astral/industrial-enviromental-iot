package com.corp.iot.backend.tenant.repository;

import com.corp.iot.backend.tenant.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantRepository extends JpaRepository<Tenant, Long> {
}
