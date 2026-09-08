package com.corp.iot.processing.alert;

import com.corp.iot.processing.dto.AlertConditionGroup;
import com.corp.iot.processing.entity.AlertRule;
import com.corp.iot.processing.entity.SourceType;
import com.corp.iot.processing.repository.AlertRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.List;

/**
 * Rule áp cho một reading, cache Redis {@code alert-rules:{tenantId}:{tenantNodeId}:{metricCode}}
 * (xem DATABASE.md §5).
 *
 * Key gắn với node BÁO VỀ chứ không phải node của rule: rule ở node cha phủ cả subtree, nên tập
 * rule của mỗi site là khác nhau dù cùng metric. Cache cả kết quả rỗng — phần lớn reading không có
 * rule nào, đó mới là trường hợp cần tránh query lặp.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlertRuleResolver {

    private static final TypeReference<List<ResolvedRule>> RULE_LIST = new TypeReference<>() {
    };

    private final AlertRuleRepository alertRuleRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.alert.rule-cache-ttl-seconds:60}")
    private long cacheTtlSeconds;

    public List<ResolvedRule> resolve(Long tenantId, Long tenantNodeId, Long metricId, String metricCode) {
        String key = "alert-rules:%d:%d:%s".formatted(tenantId, tenantNodeId, metricCode);
        try {
            String cached = redisTemplate.opsForValue().get(key);
            if (cached != null) {
                return objectMapper.readValue(cached, RULE_LIST);
            }
        } catch (Exception e) {
            log.warn("Không đọc được cache {}, query lại Postgres", key, e);
        }

        List<ResolvedRule> resolved = alertRuleRepository
                .findApplicable(tenantId, tenantNodeId, metricId).stream()
                .map(ResolvedRule::from)
                .toList();
        try {
            redisTemplate.opsForValue().set(
                    key, objectMapper.writeValueAsString(resolved), Duration.ofSeconds(cacheTtlSeconds));
        } catch (Exception e) {
            log.warn("Không ghi được cache {}", key, e);
        }
        return resolved;
    }

    /**
     * {@code sourceType} null = rule áp cho mọi loại nguồn. Bản ghi cache ghi trước `V18` không có
     * field này, Jackson map thành null — đúng ngữ nghĩa lúc nó được ghi, nên không cần xoá cache.
     */
    public record ResolvedRule(
            Long id, String name, String severity, int durationSeconds, AlertConditionGroup conditions,
            SourceType sourceType) {

        static ResolvedRule from(AlertRule rule) {
            return new ResolvedRule(
                    rule.getId(), rule.getName(), rule.getSeverity(), rule.getDurationSeconds(),
                    rule.getConditions(), rule.getSourceType());
        }

        /** Rule không giới hạn nguồn thì nhận mọi kênh; có giới hạn thì phải khớp đúng loại. */
        public boolean appliesTo(SourceType datastreamSourceType) {
            return sourceType == null || sourceType == datastreamSourceType;
        }
    }
}
