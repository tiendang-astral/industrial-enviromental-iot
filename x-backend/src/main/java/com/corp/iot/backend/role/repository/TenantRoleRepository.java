package com.corp.iot.backend.role.repository;

import com.corp.iot.backend.role.entity.TenantRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TenantRoleRepository extends JpaRepository<TenantRole, Long> {

    Optional<TenantRole> findByValue(String value);
}
