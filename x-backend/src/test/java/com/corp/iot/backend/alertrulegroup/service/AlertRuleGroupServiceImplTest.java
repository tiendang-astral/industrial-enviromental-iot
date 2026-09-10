package com.corp.iot.backend.alertrulegroup.service;

import com.corp.iot.backend.alert.service.AlertClosingService;
import com.corp.iot.backend.alertrule.dto.AlertChannelRequest;
import com.corp.iot.backend.alertrule.dto.AlertCondition;
import com.corp.iot.backend.alertrule.dto.AlertConditionGroup;
import com.corp.iot.backend.alertrule.entity.AlertRule;
import com.corp.iot.backend.alertrule.entity.AlertSeverity;
import com.corp.iot.backend.alertrule.entity.ChannelType;
import com.corp.iot.backend.alertrule.mapper.AlertRuleMapper;
import com.corp.iot.backend.alertrule.repository.AlertChannelRepository;
import com.corp.iot.backend.alertrule.repository.AlertRuleRepository;
import com.corp.iot.backend.alertrule.service.AlertConditionValidator;
import com.corp.iot.backend.alertrule.service.AlertRuleCacheEvictor;
import com.corp.iot.backend.alertrulegroup.dto.AlertRuleGroupDtos.AlertRuleGroupResponse;
import com.corp.iot.backend.alertrulegroup.dto.AlertRuleGroupDtos.MetricRuleInput;
import com.corp.iot.backend.alertrulegroup.dto.AlertRuleGroupDtos.SaveAlertRuleGroupRequest;
import com.corp.iot.backend.alertrulegroup.entity.AlertRuleGroup;
import com.corp.iot.backend.alertrulegroup.repository.AlertRuleGroupRepository;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.common.security.UserType;
import com.corp.iot.backend.datastream.entity.SourceType;
import com.corp.iot.backend.externalsource.repository.ExternalSourceRepository;
import com.corp.iot.backend.gateway.repository.GatewayRepository;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AlertRuleGroupServiceImplTest {

    private AlertRuleGroupRepository groupRepository;
    private AlertRuleRepository ruleRepository;
    private AlertChannelRepository channelRepository;
    private AlertRuleCacheEvictor cacheEvictor;
    private AlertClosingService alertClosingService;
    private GatewayRepository gatewayRepository;
    private ExternalSourceRepository externalSourceRepository;
    private AlertRuleGroupServiceImpl service;

    private final List<AlertRule> saved = new ArrayList<>();

    @BeforeEach
    void setUp() {
        groupRepository = mock(AlertRuleGroupRepository.class);
        ruleRepository = mock(AlertRuleRepository.class);
        channelRepository = mock(AlertChannelRepository.class);
        MetricRepository metricRepository = mock(MetricRepository.class);
        TenantNodeRepository tenantNodeRepository = mock(TenantNodeRepository.class);
        cacheEvictor = mock(AlertRuleCacheEvictor.class);
        alertClosingService = mock(AlertClosingService.class);
        ScopeService scopeService = mock(ScopeService.class);
        gatewayRepository = mock(GatewayRepository.class);
        externalSourceRepository = mock(ExternalSourceRepository.class);
        // Gateway 10, 11 và nguồn 3 tồn tại trong tenant; mọi id khác coi như không có.
        when(gatewayRepository.existsById(10L)).thenReturn(true);
        when(gatewayRepository.existsById(11L)).thenReturn(true);
        when(externalSourceRepository.existsById(3L)).thenReturn(true);

        service = new AlertRuleGroupServiceImpl(groupRepository, ruleRepository, channelRepository,
                metricRepository, tenantNodeRepository, new AlertRuleMapper(), cacheEvictor,
                new AlertConditionValidator(), alertClosingService, externalSourceRepository,
                gatewayRepository, scopeService);

        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AppUserPrincipal(1L, 12L, "u", UserType.TENANT, List.of()), null, List.of()));
        // null = full access toàn tenant.
        when(scopeService.resolveAccessibleNodeIds(anyLong(), anyLong())).thenReturn(null);
        when(tenantNodeRepository.existsById(anyLong())).thenReturn(true);
        // Cây: 1 -> 1.2 -> 1.2.5 (Khu B) -> 1.2.5.4 / 1.2.5.8 / 1.2.5.9 (3 site con)
        stubNode(tenantNodeRepository, 5L, "1.2.5");
        stubNode(tenantNodeRepository, 4L, "1.2.5.4");
        stubNode(tenantNodeRepository, 8L, "1.2.5.8");
        stubNode(tenantNodeRepository, 9L, "1.2.5.9");
        stubNode(tenantNodeRepository, 6L, "1.6");
        stubNode(tenantNodeRepository, 99L, "1.99");
        when(metricRepository.existsById(anyLong())).thenReturn(true);
        when(metricRepository.findAllById(any())).thenReturn(List.of());
        when(channelRepository.findByAlertRuleId(anyLong())).thenReturn(List.of());
        when(groupRepository.save(any(AlertRuleGroup.class))).thenAnswer(invocation -> {
            AlertRuleGroup group = invocation.getArgument(0);
            if (group.getId() == null) group.setId(1L);
            return group;
        });
        AtomicLong ids = new AtomicLong(100);
        when(ruleRepository.save(any(AlertRule.class))).thenAnswer(invocation -> {
            AlertRule rule = invocation.getArgument(0);
            if (rule.getId() == null) {
                rule.setId(ids.incrementAndGet());
                saved.add(rule);
            }
            return rule;
        });
    }

    private static void stubNode(TenantNodeRepository repository, Long id, String path) {
        TenantNode node = new TenantNode();
        node.setId(id);
        node.setPath(path);
        when(repository.findById(id)).thenReturn(Optional.of(node));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        saved.clear();
    }

    private MetricRuleInput metric(long metricId) {
        return new MetricRuleInput(metricId,
                new AlertConditionGroup("OR", List.of(new AlertCondition(">", 35.0))), 300);
    }

    private SaveAlertRuleGroupRequest request(List<Long> nodeIds, List<MetricRuleInput> metrics) {
        return scoped(SourceType.GATEWAY_PIN, List.of(10L), null, nodeIds, metrics);
    }

    private SaveAlertRuleGroupRequest scoped(SourceType sourceType, List<Long> gatewayIds,
                                             List<Long> externalSourceIds, List<Long> nodeIds,
                                             List<MetricRuleInput> metrics) {
        return new SaveAlertRuleGroupRequest("Giám sát chuồng", AlertSeverity.CRITICAL, sourceType,
                gatewayIds, externalSourceIds, nodeIds, metrics,
                List.of(new AlertChannelRequest(ChannelType.EMAIL, "Trực ca", "truc@corp.vn", null)));
    }

    @Test
    void baDonViNhanHaiChiSoSinhSauRuleCon() {
        AlertRuleGroupResponse response =
                service.create(request(List.of(4L, 8L, 9L), List.of(metric(5L), metric(6L))));

        assertThat(saved).hasSize(6);
        assertThat(response.ruleCount()).isEqualTo(6);
        assertThat(saved).allSatisfy(rule -> {
            assertThat(rule.getGroupId()).isEqualTo(1L);
            assertThat(rule.getName()).isEqualTo("Giám sát chuồng");
            assertThat(rule.getSeverity()).isEqualTo(AlertSeverity.CRITICAL);
            assertThat(rule.isEnabled()).isTrue();
        });
        // Mỗi rule con có kênh riêng (alert_channel gắn theo rule, không theo nhóm).
        verify(channelRepository, org.mockito.Mockito.times(6)).save(any());
    }

    @Test
    void tickChaCoBaConChiSinhMotRuleMoiChiSo() {
        // Ô chọn tổ chức tick cha là tick luôn 3 con, nên danh sách gửi lên có 4 id. Rule vốn đã
        // phủ subtree — giữ cả 4 sẽ tạo rule trùng và bắn 2 cảnh báo cho 1 lần vi phạm.
        service.create(request(List.of(5L, 4L, 8L, 9L), List.of(metric(1L))));

        assertThat(saved).hasSize(1);
        assertThat(saved.getFirst().getTenantNodeId()).isEqualTo(5L);
    }

    @Test
    void haiNhanhRoiNhauThiGiuCaHai() {
        service.create(request(List.of(5L, 6L), List.of(metric(1L))));

        assertThat(saved).hasSize(2);
    }

    @Test
    void sourceTypeVaPhamViCuaNhomChepXuongMoiRuleCon() {
        // Engine chỉ đọc alert_rule — phạm vi không chép xuống thì rule con hiểu thành "mọi thiết bị".
        service.create(scoped(SourceType.GATEWAY_PIN, List.of(10L, 11L, 10L), null,
                List.of(4L, 8L), List.of(metric(1L))));

        assertThat(saved).hasSize(2);
        assertThat(saved).allSatisfy(rule -> {
            assertThat(rule.getSourceType()).isEqualTo(SourceType.GATEWAY_PIN);
            assertThat(rule.getGatewayIds()).containsExactly(10L, 11L);
            assertThat(rule.getExternalSourceIds()).isNull();
        });
    }

    @Test
    void nguonDuLieuNgoaiChepDanhSachNguonVaBoTrongDanhSachThietBi() {
        service.create(scoped(SourceType.EXTERNAL_SOURCE_JOB, null, List.of(3L), List.of(4L), List.of(metric(1L))));

        // Loại còn lại phải NULL chứ không phải [] — ck_alert_rule_scope ở DB chặn cả hai cùng có giá trị.
        assertThat(saved.getFirst().getExternalSourceIds()).containsExactly(3L);
        assertThat(saved.getFirst().getGatewayIds()).isNull();
    }

    @Test
    void phamViRongBiChan() {
        assertThatThrownBy(() -> service.create(scoped(SourceType.GATEWAY_PIN, List.of(), null,
                List.of(4L), List.of(metric(1L)))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "SCOPE_REQUIRED");
    }

    @Test
    void danhSachKhongKhopLoaiNguonBiChan() {
        // Áp cho thiết bị mà lại gửi kèm danh sách nguồn: cấu hình vô nghĩa, không được lặng lẽ bỏ qua.
        assertThatThrownBy(() -> service.create(scoped(SourceType.GATEWAY_PIN, List.of(10L), List.of(3L),
                List.of(4L), List.of(metric(1L)))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "SCOPE_TYPE_MISMATCH");
    }

    @Test
    void thietBiKhongTonTaiBiChan() {
        // existsById đi qua @TenantId nên gateway của tenant khác cũng rơi vào nhánh này.
        assertThatThrownBy(() -> service.create(scoped(SourceType.GATEWAY_PIN, List.of(10L, 777L), null,
                List.of(4L), List.of(metric(1L)))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "GATEWAY_NOT_FOUND");
    }

    @Test
    void donViTrungBiLocTruocKhiTraiPhang() {
        service.create(request(List.of(4L, 4L, 8L), List.of(metric(1L))));

        assertThat(saved).hasSize(2);
    }

    @Test
    void motChiSoKhaiHaiLanBiChan() {
        assertThatThrownBy(() -> service.create(request(List.of(4L), List.of(metric(1L), metric(1L)))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "DUPLICATE_METRIC");
    }

    @Test
    void donViNgoaiPhamViBiChan() {
        ScopeService scoped = mock(ScopeService.class);
        when(scoped.resolveAccessibleNodeIds(anyLong(), anyLong())).thenReturn(java.util.Set.of(4L));
        TenantNodeRepository nodes = mock(TenantNodeRepository.class);
        when(nodes.existsById(anyLong())).thenReturn(true);
        MetricRepository metrics = mock(MetricRepository.class);
        when(metrics.existsById(anyLong())).thenReturn(true);
        AlertRuleGroupServiceImpl scopedService = new AlertRuleGroupServiceImpl(groupRepository, ruleRepository,
                channelRepository, metrics, nodes, new AlertRuleMapper(), cacheEvictor,
                new AlertConditionValidator(), alertClosingService, externalSourceRepository,
                gatewayRepository, scoped);

        stubNode(nodes, 4L, "1.2.5.4");
        stubNode(nodes, 99L, "1.99");
        assertThatThrownBy(() -> scopedService.create(request(List.of(4L, 99L), List.of(metric(1L)))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "NODE_OUT_OF_SCOPE");
    }

    @Test
    void suaGiuLaiRuleConCuaCapVanConDuocChon() {
        AlertRuleGroup group = new AlertRuleGroup();
        group.setId(1L);
        group.setName("Giám sát chuồng");
        group.setSeverity(AlertSeverity.CRITICAL);
        when(groupRepository.findById(1L)).thenReturn(Optional.of(group));

        AlertRule keep = existingRule(101L, 4L, 5L);
        AlertRule drop = existingRule(102L, 8L, 5L);
        when(ruleRepository.findByGroupId(1L)).thenReturn(List.of(keep, drop));

        // Bỏ đơn vị 8, giữ đơn vị 4 và đổi ngưỡng.
        service.update(1L, new SaveAlertRuleGroupRequest("Giám sát chuồng", AlertSeverity.WARNING,
                SourceType.GATEWAY_PIN, List.of(10L), null, List.of(4L),
                List.of(new MetricRuleInput(5L, new AlertConditionGroup("AND",
                        List.of(new AlertCondition(">=", 20.0), new AlertCondition("<=", 30.0))), 60)),
                List.of(new AlertChannelRequest(ChannelType.EMAIL, null, "truc@corp.vn", null))));

        // Rule của cặp còn được chọn KHÔNG bị xoá — alert đang mở của nó vẫn đóng lại được.
        assertThat(keep.getDeletedAt()).isNull();
        assertThat(keep.getDurationSeconds()).isEqualTo(60);
        assertThat(keep.getConditions().logic()).isEqualTo("AND");
        assertThat(drop.getDeletedAt()).isNotNull();
        verify(alertClosingService).closeOpenAlerts(List.of(102L));
        // Không tạo thêm rule mới nào vì cặp (4,5) đã tồn tại.
        assertThat(saved).isEmpty();
    }

    @Test
    void tatNhomThiDongLuonAlertDangMo() {
        AlertRuleGroup group = new AlertRuleGroup();
        group.setId(1L);
        group.setName("Giám sát chuồng");
        group.setSeverity(AlertSeverity.CRITICAL);
        when(groupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(ruleRepository.findByGroupId(1L))
                .thenReturn(List.of(existingRule(101L, 4L, 5L), existingRule(102L, 8L, 5L)));

        service.updateStatus(1L, false);

        // Engine không resolve rule đã tắt nữa — không đóng ở đây thì alert đứng im vĩnh viễn.
        verify(alertClosingService).closeOpenAlerts(List.of(101L, 102L));
    }

    @Test
    void batNhomThiKhongDungToiAlertNao() {
        AlertRuleGroup group = new AlertRuleGroup();
        group.setId(1L);
        group.setName("Giám sát chuồng");
        group.setSeverity(AlertSeverity.CRITICAL);
        when(groupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(ruleRepository.findByGroupId(1L)).thenReturn(List.of(existingRule(101L, 4L, 5L)));

        service.updateStatus(1L, true);

        verify(alertClosingService, org.mockito.Mockito.never()).closeOpenAlerts(any());
    }

    @Test
    void xoaNhomThiDongLuonAlertDangMo() {
        AlertRuleGroup group = new AlertRuleGroup();
        group.setId(1L);
        group.setName("Giám sát chuồng");
        group.setSeverity(AlertSeverity.CRITICAL);
        when(groupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(ruleRepository.findByGroupId(1L)).thenReturn(List.of(existingRule(101L, 4L, 5L)));

        service.delete(1L);

        verify(alertClosingService).closeOpenAlerts(List.of(101L));
    }

    @Test
    void tatNhomLaTatMoiRuleCon() {
        AlertRuleGroup group = new AlertRuleGroup();
        group.setId(1L);
        group.setName("Giám sát chuồng");
        group.setSeverity(AlertSeverity.CRITICAL);
        when(groupRepository.findById(1L)).thenReturn(Optional.of(group));
        AlertRule a = existingRule(101L, 4L, 5L);
        AlertRule b = existingRule(102L, 8L, 5L);
        when(ruleRepository.findByGroupId(1L)).thenReturn(List.of(a, b));

        AlertRuleGroupResponse response = service.updateStatus(1L, false);

        assertThat(a.isEnabled()).isFalse();
        assertThat(b.isEnabled()).isFalse();
        assertThat(response.enabled()).isFalse();
        ArgumentCaptor<AlertRule> evicted = ArgumentCaptor.forClass(AlertRule.class);
        verify(cacheEvictor, org.mockito.Mockito.times(2)).evict(evicted.capture());
    }

    private AlertRule existingRule(long id, long nodeId, long metricId) {
        AlertRule rule = new AlertRule();
        rule.setId(id);
        rule.setGroupId(1L);
        rule.setTenantNodeId(nodeId);
        rule.setMetricId(metricId);
        rule.setEnabled(true);
        rule.setConditions(new AlertConditionGroup("OR", List.of(new AlertCondition(">", 35.0))));
        return rule;
    }
}
