package com.corp.iot.backend.alertrule.service;

import com.corp.iot.backend.alertrule.entity.AlertRule;
import com.corp.iot.backend.common.tenant.TenantContext;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Xoá cache rule của x-processing-service ngay khi rule đổi (key
 * {@code alert-rules:{tenantId}:{tenantNodeId}:{metricCode}}, xem DATABASE.md §5).
 *
 * Key gắn với node BÁO VỀ chứ không phải node của rule — rule ở node cha phủ cả subtree, nên phải
 * xoá key của mọi node hậu duệ. Không có bước này thì rule mới phải đợi hết TTL 60s mới có hiệu lực.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlertRuleCacheEvictor {

    private final TenantNodeRepository tenantNodeRepository;
    private final MetricRepository metricRepository;
    private final StringRedisTemplate redisTemplate;

    public void evict(AlertRule rule) {
        String metricCode = metricRepository.findById(rule.getMetricId())
                .map(metric -> metric.getCode())
                .orElse(null);
        if (metricCode == null) {
            return;
        }
        Long tenantId = TenantContext.getTenantId();
        List<Long> nodeIds = tenantNodeRepository.findById(rule.getTenantNodeId())
                .map(node -> tenantNodeRepository.findDescendantIdsIncludingSelf(tenantId, node.getPath()))
                .orElse(List.of());
        try {
            redisTemplate.delete(nodeIds.stream()
                    .map(nodeId -> "alert-rules:%d:%d:%s".formatted(tenantId, nodeId, metricCode))
                    .toList());
        } catch (Exception e) {
            // Redis hỏng chỉ làm rule mới chậm hiệu lực tới hết TTL, không sai kết quả.
            log.warn("Không xoá được cache alert-rules cho rule id={}", rule.getId(), e);
        }
    }
}
