package com.corp.iot.backend.alert.repository;

import com.corp.iot.backend.alert.entity.Alert;
import com.corp.iot.backend.alert.entity.AlertStatus;
import com.corp.iot.backend.alertrule.entity.AlertSeverity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
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

    /**
     * Dọn cảnh báo của một kênh trước khi xoá kênh. `fk_alert_datastream` là NO ACTION nên không
     * dọn thì lệnh xoá kênh chết ngay ở tầng DB — kênh nào từng vượt ngưỡng là không xoá nổi.
     */
    void deleteByDatastreamId(Long datastreamId);

    List<Alert> findByRuleIdInAndStatusIn(Collection<Long> ruleIds, Collection<AlertStatus> statuses);

    /**
     * `filterDatastreams=false` = không lọc theo kênh; cờ riêng thay vì `:datastreamIds IS NULL`
     * vì tham số tập hợp rỗng/null không dùng được trong `IN`, mà tách thêm hai method nữa thì
     * số biến thể nhân đôi theo từng chiều lọc.
     *
     * Sự cố trong một khoảng thời gian (báo cáo — Phase 8). Mốc chọn là `started_at` chứ không phải
     * khoảng giao nhau: một sự cố kéo dài qua ranh giới kỳ báo cáo chỉ được tính đúng một lần, ở kỳ
     * nó bắt đầu. Dùng index ix_alert_started.
     */
    @Query("""
            SELECT a FROM Alert a
            WHERE a.startedAt >= :from AND a.startedAt < :to
              AND (:severity IS NULL OR a.severity = :severity)
              AND (:filterDatastreams = FALSE OR a.datastreamId IN :datastreamIds)
            ORDER BY a.startedAt DESC
            """)
    List<Alert> findInRange(@Param("from") Instant from, @Param("to") Instant to,
                            @Param("severity") AlertSeverity severity,
                            @Param("filterDatastreams") boolean filterDatastreams,
                            @Param("datastreamIds") Collection<Long> datastreamIds,
                            Pageable pageable);

    @Query("""
            SELECT a FROM Alert a
            WHERE a.startedAt >= :from AND a.startedAt < :to
              AND a.tenantNodeId IN :nodeIds
              AND (:severity IS NULL OR a.severity = :severity)
              AND (:filterDatastreams = FALSE OR a.datastreamId IN :datastreamIds)
            ORDER BY a.startedAt DESC
            """)
    List<Alert> findInRangeByNodes(@Param("from") Instant from, @Param("to") Instant to,
                                   @Param("nodeIds") Collection<Long> nodeIds,
                                   @Param("severity") AlertSeverity severity,
                                   @Param("filterDatastreams") boolean filterDatastreams,
                                   @Param("datastreamIds") Collection<Long> datastreamIds,
                                   Pageable pageable);

    /** Số lần cảnh báo theo từng kênh trong khoảng — cột "số lần vượt ngưỡng" của báo cáo môi trường. */
    @Query("""
            SELECT a.datastreamId, COUNT(a) FROM Alert a
            WHERE a.startedAt >= :from AND a.startedAt < :to AND a.datastreamId IN :datastreamIds
            GROUP BY a.datastreamId
            """)
    List<Object[]> countByDatastreamInRange(@Param("from") Instant from, @Param("to") Instant to,
                                            @Param("datastreamIds") Collection<Long> datastreamIds);
}
