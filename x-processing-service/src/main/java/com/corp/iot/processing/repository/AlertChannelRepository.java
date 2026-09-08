package com.corp.iot.processing.repository;

import com.corp.iot.processing.entity.AlertChannel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertChannelRepository extends JpaRepository<AlertChannel, Long> {

    List<AlertChannel> findByAlertRuleId(Long alertRuleId);
}
