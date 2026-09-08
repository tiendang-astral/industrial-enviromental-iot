package com.corp.iot.backend.alertrule.repository;

import com.corp.iot.backend.alertrule.entity.AlertRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface AlertRuleRepository extends JpaRepository<AlertRule, Long> {

    List<AlertRule> findByTenantNodeIdInOrderByNameAsc(Collection<Long> tenantNodeIds);

    List<AlertRule> findAllByOrderByNameAsc();

    List<AlertRule> findByGroupId(Long groupId);

    List<AlertRule> findByGroupIdIn(Collection<Long> groupIds);
}
