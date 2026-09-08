package com.corp.iot.processing.repository;

import com.corp.iot.processing.entity.AlertRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AlertRuleRepository extends JpaRepository<AlertRule, Long> {

    /**
     * Rule áp cho reading vừa về: rule gắn ở chính node báo về HOẶC ở bất kỳ node tổ tiên nào —
     * tạo 1 rule ở Khu sản xuất là phủ hết chuồng bên dưới.
     *
     * Native query vì {@code @>} (ancestor-or-self của ltree) không biểu diễn được bằng JPQL;
     * nó dùng GiST index trên {@code tenant_node.path} nên không phải quét cây.
     */
    @Query(value = """
            SELECT r.* FROM alert_rule r
            WHERE r.tenant_id = :tenantId
              AND r.metric_id = :metricId
              AND r.enabled = true
              AND r.deleted_at IS NULL
              AND r.tenant_node_id IN (
                  SELECT ancestor.id FROM tenant_node ancestor, tenant_node self
                  WHERE self.id = :tenantNodeId
                    AND ancestor.tenant_id = :tenantId
                    AND ancestor.deleted_at IS NULL
                    AND ancestor.path @> self.path
              )
            """, nativeQuery = true)
    List<AlertRule> findApplicable(
            @Param("tenantId") Long tenantId,
            @Param("tenantNodeId") Long tenantNodeId,
            @Param("metricId") Long metricId);
}
