package com.corp.iot.processing.alert;

import com.corp.iot.processing.alert.AlertRuleResolver.ResolvedRule;
import com.corp.iot.processing.dto.AlertCondition;
import com.corp.iot.processing.dto.AlertConditionGroup;
import com.corp.iot.processing.entity.AlertRule;
import com.corp.iot.processing.repository.AlertRuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AlertRuleResolverTest {

    private static final Long TENANT_ID = 12L;
    private static final Long SITE_ID = 56L;
    private static final Long METRIC_ID = 5L;
    private static final String CACHE_KEY = "alert-rules:12:56:temperature";

    private AlertRuleRepository alertRuleRepository;
    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOps;
    private ObjectMapper objectMapper;
    private AlertRuleResolver resolver;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        alertRuleRepository = mock(AlertRuleRepository.class);
        redisTemplate = mock(StringRedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        objectMapper = new ObjectMapper();
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        resolver = new AlertRuleResolver(alertRuleRepository, redisTemplate, objectMapper);
        ReflectionTestUtils.setField(resolver, "cacheTtlSeconds", 60L);
    }

    private AlertRule rule(Long id, Long nodeId) {
        AlertRule rule = new AlertRule();
        rule.setId(id);
        rule.setTenantId(TENANT_ID);
        rule.setTenantNodeId(nodeId);
        rule.setName("Nhiệt độ cao");
        rule.setMetricId(METRIC_ID);
        rule.setSeverity("CRITICAL");
        rule.setDurationSeconds(300);
        rule.setConditions(new AlertConditionGroup("OR", List.of(new AlertCondition(">", 35.0))));
        rule.setEnabled(true);
        return rule;
    }

    @Test
    void cacheMissThiQueryPostgresRoiGhiCache() {
        // Rule gắn ở node cha (khu sản xuất id=40) vẫn áp cho reading của site con id=56.
        when(valueOps.get(CACHE_KEY)).thenReturn(null);
        when(alertRuleRepository.findApplicable(TENANT_ID, SITE_ID, METRIC_ID))
                .thenReturn(List.of(rule(7L, 40L)));

        List<ResolvedRule> resolved = resolver.resolve(TENANT_ID, SITE_ID, METRIC_ID, "temperature");

        assertThat(resolved).hasSize(1);
        assertThat(resolved.getFirst().id()).isEqualTo(7L);
        assertThat(resolved.getFirst().durationSeconds()).isEqualTo(300);
        verify(valueOps).set(eq(CACHE_KEY), any(), eq(Duration.ofSeconds(60)));
    }

    @Test
    void sourceTypeCuaRuleDiVaoKetQuaResolve() {
        when(valueOps.get(CACHE_KEY)).thenReturn(null);
        AlertRule onlyGateway = rule(7L, 40L);
        onlyGateway.setSourceType(com.corp.iot.processing.entity.SourceType.GATEWAY_PIN);
        when(alertRuleRepository.findApplicable(TENANT_ID, SITE_ID, METRIC_ID)).thenReturn(List.of(onlyGateway));

        ResolvedRule resolved = resolver.resolve(TENANT_ID, SITE_ID, METRIC_ID, "temperature").getFirst();

        // Rơi mất field này thì rule bị hiểu thành "mọi nguồn" — mất hẳn tác dụng của V18.
        assertThat(resolved.sourceType()).isEqualTo(com.corp.iot.processing.entity.SourceType.GATEWAY_PIN);
        assertThat(resolved.appliesTo(com.corp.iot.processing.entity.SourceType.EXTERNAL_SOURCE_JOB)).isFalse();
    }

    @Test
    void cacheHitThiKhongChamPostgres() throws Exception {
        String cached = objectMapper.writeValueAsString(
                List.of(new ResolvedRule(7L, "Nhiệt độ cao", "CRITICAL", 300,
                        new AlertConditionGroup("OR", List.of(new AlertCondition(">", 35.0))), null)));
        when(valueOps.get(CACHE_KEY)).thenReturn(cached);

        List<ResolvedRule> resolved = resolver.resolve(TENANT_ID, SITE_ID, METRIC_ID, "temperature");

        assertThat(resolved).hasSize(1);
        assertThat(resolved.getFirst().conditions().conditions()).containsExactly(new AlertCondition(">", 35.0));
        verify(alertRuleRepository, never()).findApplicable(anyLong(), anyLong(), anyLong());
    }

    @Test
    void khongCoRuleNaoThiVanCacheKetQuaRong() {
        // Phần lớn reading rơi vào nhánh này — không cache thì mỗi message là một query thừa.
        when(valueOps.get(CACHE_KEY)).thenReturn(null);
        when(alertRuleRepository.findApplicable(TENANT_ID, SITE_ID, METRIC_ID)).thenReturn(List.of());

        assertThat(resolver.resolve(TENANT_ID, SITE_ID, METRIC_ID, "temperature")).isEmpty();
        verify(valueOps).set(eq(CACHE_KEY), eq("[]"), eq(Duration.ofSeconds(60)));
    }

    @Test
    void redisHongThiVanTraDungRuleTuPostgres() {
        when(valueOps.get(CACHE_KEY)).thenThrow(new RuntimeException("redis down"));
        when(alertRuleRepository.findApplicable(TENANT_ID, SITE_ID, METRIC_ID))
                .thenReturn(List.of(rule(7L, 40L)));

        assertThat(resolver.resolve(TENANT_ID, SITE_ID, METRIC_ID, "temperature")).hasSize(1);
    }
}
