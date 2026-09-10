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

import com.corp.iot.processing.alert.AlertRuleResolver.RuleKey;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyList;

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
        when(valueOps.multiGet(List.of(CACHE_KEY))).thenReturn(java.util.Collections.singletonList(null));
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
        when(valueOps.multiGet(List.of(CACHE_KEY))).thenReturn(java.util.Collections.singletonList(null));
        AlertRule onlyGateway = rule(7L, 40L);
        onlyGateway.setSourceType(com.corp.iot.processing.entity.SourceType.GATEWAY_PIN);
        when(alertRuleRepository.findApplicable(TENANT_ID, SITE_ID, METRIC_ID)).thenReturn(List.of(onlyGateway));

        ResolvedRule resolved = resolver.resolve(TENANT_ID, SITE_ID, METRIC_ID, "temperature").getFirst();

        // Rơi mất field này thì rule bị hiểu thành "mọi nguồn" — mất hẳn tác dụng của V18.
        assertThat(resolved.sourceType()).isEqualTo(com.corp.iot.processing.entity.SourceType.GATEWAY_PIN);
        assertThat(resolved.appliesTo(com.corp.iot.processing.entity.SourceType.EXTERNAL_SOURCE_JOB, null)).isFalse();
    }

    @Test
    void cacheHitThiKhongChamPostgres() throws Exception {
        String cached = objectMapper.writeValueAsString(
                List.of(new ResolvedRule(7L, "Nhiệt độ cao", "CRITICAL", 300,
                        new AlertConditionGroup("OR", List.of(new AlertCondition(">", 35.0))), null, null, null)));
        when(valueOps.multiGet(List.of(CACHE_KEY))).thenReturn(List.of(cached));

        List<ResolvedRule> resolved = resolver.resolve(TENANT_ID, SITE_ID, METRIC_ID, "temperature");

        assertThat(resolved).hasSize(1);
        assertThat(resolved.getFirst().conditions().conditions()).containsExactly(new AlertCondition(">", 35.0));
        verify(alertRuleRepository, never()).findApplicable(anyLong(), anyLong(), anyLong());
    }

    @Test
    void khongCoRuleNaoThiVanCacheKetQuaRong() {
        // Phần lớn reading rơi vào nhánh này — không cache thì mỗi message là một query thừa.
        when(valueOps.multiGet(List.of(CACHE_KEY))).thenReturn(java.util.Collections.singletonList(null));
        when(alertRuleRepository.findApplicable(TENANT_ID, SITE_ID, METRIC_ID)).thenReturn(List.of());

        assertThat(resolver.resolve(TENANT_ID, SITE_ID, METRIC_ID, "temperature")).isEmpty();
        verify(valueOps).set(eq(CACHE_KEY), eq("[]"), eq(Duration.ofSeconds(60)));
    }

    @Test
    void redisHongThiVanTraDungRuleTuPostgres() {
        when(valueOps.multiGet(List.of(CACHE_KEY))).thenThrow(new RuntimeException("redis down"));
        when(alertRuleRepository.findApplicable(TENANT_ID, SITE_ID, METRIC_ID))
                .thenReturn(List.of(rule(7L, 40L)));

        assertThat(resolver.resolve(TENANT_ID, SITE_ID, METRIC_ID, "temperature")).hasSize(1);
    }

    // ---------- resolveAll (gộp theo lô) ----------
    //
    // Bẫy chính: resolve() CỐ Ý cache cả danh sách rỗng vì phần lớn reading không có rule nào.
    // Với MGET, null = miss thật còn "[]" = hit-rỗng. Lẫn hai thứ này là sai:
    //   - coi "[]" là miss  -> mất sạch lợi ích cache
    //   - coi null là "[]"  -> BỎ SÓT CẢNH BÁO, âm thầm, không log nào báo

    private static final RuleKey KEY_TEMP = new RuleKey(TENANT_ID, SITE_ID, METRIC_ID, "temperature");
    private static final RuleKey KEY_NH3 = new RuleKey(TENANT_ID, SITE_ID, 6L, "nh3");

    @Test
    void cacheRongLaHitChuKhongPhaiMiss() {
        when(valueOps.multiGet(List.of(CACHE_KEY))).thenReturn(List.of("[]"));

        Map<RuleKey, List<ResolvedRule>> out = resolver.resolveAll(List.of(KEY_TEMP));

        assertThat(out.get(KEY_TEMP)).isEmpty();
        verify(alertRuleRepository, never()).findApplicable(anyLong(), anyLong(), anyLong());
    }

    @Test
    void cacheMissThiPhaiQueryPostgresChuKhongDuocCoiLaKhongCoRule() {
        when(valueOps.multiGet(List.of(CACHE_KEY))).thenReturn(java.util.Collections.singletonList(null));
        when(alertRuleRepository.findApplicable(TENANT_ID, SITE_ID, METRIC_ID)).thenReturn(List.of(rule(7L, 40L)));

        Map<RuleKey, List<ResolvedRule>> out = resolver.resolveAll(List.of(KEY_TEMP));

        assertThat(out.get(KEY_TEMP)).hasSize(1);
        verify(alertRuleRepository).findApplicable(TENANT_ID, SITE_ID, METRIC_ID);
    }

    // Trap: map.get() trả null -> NPE -> cả lô ném ra -> error handler retry vô hạn -> đứng partition.
    @Test
    void moiKhoaDuocHoiDeuCoEntryTrongKetQua() {
        when(valueOps.multiGet(anyList())).thenReturn(java.util.Arrays.asList("[]", null));
        when(alertRuleRepository.findApplicable(TENANT_ID, SITE_ID, 6L)).thenReturn(List.of());

        Map<RuleKey, List<ResolvedRule>> out = resolver.resolveAll(List.of(KEY_TEMP, KEY_NH3));

        assertThat(out).containsOnlyKeys(KEY_TEMP, KEY_NH3);
        assertThat(out.get(KEY_TEMP)).isNotNull();
        assertThat(out.get(KEY_NH3)).isNotNull();
    }

    // Một lô 500 message của 1 gateway 8 chân chỉ có <= 8 khoá khác nhau — đây là chỗ ăn nhất.
    @Test
    void khoaTrungBiGopTruocKhiHoiRedis() {
        when(valueOps.multiGet(List.of(CACHE_KEY))).thenReturn(List.of("[]"));

        Map<RuleKey, List<ResolvedRule>> out = resolver.resolveAll(List.of(KEY_TEMP, KEY_TEMP, KEY_TEMP));

        assertThat(out).containsOnlyKeys(KEY_TEMP);
        verify(valueOps).multiGet(List.of(CACHE_KEY));
    }

    // Redis nấc không được ném ra ngoài: error handler đang retry vô hạn nên sẽ treo partition.
    @Test
    void redisHongThiXuongCapVePostgresChuKhongNem() {
        when(valueOps.multiGet(anyList())).thenThrow(new RuntimeException("redis down"));
        when(alertRuleRepository.findApplicable(TENANT_ID, SITE_ID, METRIC_ID)).thenReturn(List.of(rule(7L, 40L)));

        Map<RuleKey, List<ResolvedRule>> out = resolver.resolveAll(List.of(KEY_TEMP));

        assertThat(out.get(KEY_TEMP)).hasSize(1);
    }

    @Test
    void loRongThiKhongChamRedis() {
        assertThat(resolver.resolveAll(List.of())).isEmpty();
        verify(valueOps, never()).multiGet(anyList());
    }
}
