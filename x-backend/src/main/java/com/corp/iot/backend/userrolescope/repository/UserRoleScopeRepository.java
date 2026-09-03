package com.corp.iot.backend.userrolescope.repository;

import com.corp.iot.backend.userrolescope.entity.UserRoleScope;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserRoleScopeRepository extends JpaRepository<UserRoleScope, Long> {

    List<UserRoleScope> findByUserId(Long userId);

    List<UserRoleScope> findByUserIdIn(List<Long> userIds);

    List<UserRoleScope> findByRoleId(Long roleId);

    void deleteByUserId(Long userId);
}
