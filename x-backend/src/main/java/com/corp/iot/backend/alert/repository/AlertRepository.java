package com.corp.iot.backend.alert.repository;

import com.corp.iot.backend.alert.entity.Alert;
import com.corp.iot.backend.alert.entity.AlertStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

/**
 * Lọc theo node ngay trong truy vấn chứ không lọc sau khi lấy về: cắt trần N dòng mới nhất rồi mới
 * bỏ dòng ngoài phạm vi thì user scope hẹp sẽ nhận về gần như rỗng.
 */
public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByOrderByStartedAtDesc(Pageable pageable);

    List<Alert> findByTenantNodeIdInOrderByStartedAtDesc(Collection<Long> tenantNodeIds, Pageable pageable);

    List<Alert> findByStatusInOrderByStartedAtDesc(Collection<AlertStatus> statuses, Pageable pageable);

    List<Alert> findByStatusInAndTenantNodeIdInOrderByStartedAtDesc(
            Collection<AlertStatus> statuses, Collection<Long> tenantNodeIds, Pageable pageable);

    List<Alert> findByRuleIdInAndStatusIn(Collection<Long> ruleIds, Collection<AlertStatus> statuses);
}
