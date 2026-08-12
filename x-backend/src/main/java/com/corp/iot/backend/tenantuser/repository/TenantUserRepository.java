package com.corp.iot.backend.tenantuser.repository;

import com.corp.iot.backend.tenantuser.entity.TenantUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TenantUserRepository extends JpaRepository<TenantUser, Long> {

    Optional<TenantUser> findByUsernameIgnoreCase(String username);
}
