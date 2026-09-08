package com.corp.iot.backend.alertrule.repository;

import com.corp.iot.backend.alertrule.entity.AlertChannel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface AlertChannelRepository extends JpaRepository<AlertChannel, Long> {

    List<AlertChannel> findByAlertRuleId(Long alertRuleId);

    List<AlertChannel> findByAlertRuleIdIn(Collection<Long> alertRuleIds);

    void deleteByAlertRuleId(Long alertRuleId);
}
