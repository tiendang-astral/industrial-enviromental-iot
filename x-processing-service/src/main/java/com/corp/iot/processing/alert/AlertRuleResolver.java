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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        RuleKey key = new RuleKey(tenantId, tenantNodeId, metricId, metricCode);
        return resolveAll(List.of(key)).get(key);
    }

    /**
     * Tra rule cho cả lô bằng MỘT lệnh MGET thay vì N lần GET.
     *
     * Khoá trùng được gộp trước: một lô 500 số đo của 1 gateway 8 chân chỉ có tối đa 8 metric,
     * tức 8 khoá — đó mới là phần tiết kiệm chính, không chỉ là gộp round-trip.
     *
     * Luôn trả về entry cho MỌI khoá được hỏi (rỗng nếu không có rule), nên caller không bao giờ
     * phải phân biệt "thiếu khoá trong map" với "kênh này không có rule" — nhầm chỗ đó là bỏ sót
     * cảnh báo mà không log nào báo.
     */
    public Map<RuleKey, List<ResolvedRule>> resolveAll(List<RuleKey> keys) {
        if (keys.isEmpty()) {
            return Map.of();
        }
        List<RuleKey> distinct = keys.stream().distinct().toList();
        List<String> cached = readCache(distinct.stream().map(AlertRuleResolver::cacheKey).toList());

        Map<RuleKey, List<ResolvedRule>> out = new HashMap<>(distinct.size());
        for (int i = 0; i < distinct.size(); i++) {
            RuleKey key = distinct.get(i);
            // null = MISS thật (phải hỏi Postgres). "[]" = HIT, nghĩa là kênh này thực sự không có
            // rule nào — resolve() cố ý cache cả kết quả rỗng vì phần lớn reading rơi vào ca đó.
            String raw = (cached != null && i < cached.size()) ? cached.get(i) : null;
            List<ResolvedRule> rules = raw == null ? null : deserialize(raw);
            if (rules == null) {
                rules = queryAndCache(key);
            }
            out.put(key, rules);
        }
        return out;
    }

    // Redis hỏng -> trả null để mọi khoá rơi xuống Postgres, KHÔNG ném: error handler đang retry
    // vô hạn nên một cú nấc Redis sẽ treo cả partition.
    private List<String> readCache(List<String> cacheKeys) {
        try {
            return redisTemplate.opsForValue().multiGet(cacheKeys);
        } catch (Exception e) {
            log.warn("Không đọc được cache alert-rules ({} khoá), query lại Postgres", cacheKeys.size(), e);
            return null;
        }
    }

    private List<ResolvedRule> deserialize(String raw) {
        try {
            return objectMapper.readValue(raw, RULE_LIST);
        } catch (Exception e) {
            log.warn("Giá trị cache alert-rules hỏng, query lại Postgres: {}", raw, e);
            return null;
        }
    }

    // Ghi lẻ chứ không pipeline: chỉ chạy khi cache miss, tối đa vài khoá mỗi lô và hiếm khi xảy ra.
    private List<ResolvedRule> queryAndCache(RuleKey key) {
        List<ResolvedRule> resolved = alertRuleRepository
                .findApplicable(key.tenantId(), key.tenantNodeId(), key.metricId()).stream()
                .map(ResolvedRule::from)
                .toList();
        try {
            redisTemplate.opsForValue().set(
                    cacheKey(key), objectMapper.writeValueAsString(resolved), Duration.ofSeconds(cacheTtlSeconds));
        } catch (Exception e) {
            log.warn("Không ghi được cache {}", cacheKey(key), e);
        }
        return resolved;
    }

    private static String cacheKey(RuleKey key) {
        return "alert-rules:%d:%d:%s".formatted(key.tenantId(), key.tenantNodeId(), key.metricCode());
    }

    /** metric.code là UNIQUE (uq_metric_code) nên metricCode xác định luôn metricId — gộp khoá theo code là an toàn. */
    public record RuleKey(Long tenantId, Long tenantNodeId, Long metricId, String metricCode) {
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
