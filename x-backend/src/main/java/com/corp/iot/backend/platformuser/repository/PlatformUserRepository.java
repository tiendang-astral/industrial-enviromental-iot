package com.corp.iot.backend.platformuser.repository;

import com.corp.iot.backend.platformuser.entity.PlatformUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlatformUserRepository extends JpaRepository<PlatformUser, Long> {

    Optional<PlatformUser> findByUsernameIgnoreCase(String username);
}
