package com.corp.iot.backend.alertrulegroup.repository;

import com.corp.iot.backend.alertrulegroup.entity.AlertRuleGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertRuleGroupRepository extends JpaRepository<AlertRuleGroup, Long> {

    List<AlertRuleGroup> findAllByOrderByNameAsc();
}
