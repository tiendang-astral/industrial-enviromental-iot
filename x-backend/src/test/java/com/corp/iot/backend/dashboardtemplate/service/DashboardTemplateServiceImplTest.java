package com.corp.iot.backend.dashboardtemplate.service;

import com.corp.iot.backend.common.tenant.TenantContext;
import com.corp.iot.backend.dashboard.dto.DashboardLayout;
import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboard.dto.Widget;
import com.corp.iot.backend.dashboard.dto.WidgetBinding;
import com.corp.iot.backend.dashboard.dto.WidgetLayout;
import com.corp.iot.backend.dashboard.entity.Dashboard;
import com.corp.iot.backend.dashboard.mapper.DashboardMapper;
import com.corp.iot.backend.dashboard.repository.DashboardRepository;
import com.corp.iot.backend.dashboard.service.DashboardService;
import com.corp.iot.backend.dashboardtemplate.dto.TemplateWidget;
import com.corp.iot.backend.dashboardtemplate.entity.DashboardTemplate;
import com.corp.iot.backend.dashboardtemplate.mapper.DashboardTemplateMapper;
import com.corp.iot.backend.dashboardtemplate.repository.DashboardTemplateRepository;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Board ở node gộp là ca đáng test nhất: nó gom kênh của nhiều site, nên vừa lộ chuyện xếp lưới
 * theo cỡ thật của từng loại widget, vừa lộ chuyện đặt tên kèm đơn vị.
 */
class DashboardTemplateServiceImplTest {

    private static final long TENANT_ID = 1L;
    private static final long BOARD_NODE_ID = 10L;
    private static final long CHILD_NODE_ID = 11L;

    private DashboardTemplateRepository templateRepositoryRef;
    private Dashboard dashboard;
    private DashboardTemplateServiceImpl service;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);

        DashboardTemplateRepository templateRepository = mock(DashboardTemplateRepository.class);
        templateRepositoryRef = templateRepository;
        DatastreamRepository datastreamRepository = mock(DatastreamRepository.class);
        MetricRepository metricRepository = mock(MetricRepository.class);
        TenantNodeRepository tenantNodeRepository = mock(TenantNodeRepository.class);
        DashboardService dashboardService = mock(DashboardService.class);
        DashboardRepository dashboardRepository = mock(DashboardRepository.class);

        service = new DashboardTemplateServiceImpl(templateRepository, new DashboardTemplateMapper(),
                datastreamRepository, metricRepository, tenantNodeRepository, dashboardService,
                dashboardRepository, new DashboardMapper());

        DashboardTemplate template = new DashboardTemplate();
        template.setId(7L);
        template.setName("Giám sát cơ bản");
        template.setLayoutJson(List.of(
                new TemplateWidget("LINE", "temperature", new WidgetLayout(0, 0, 8, 4), Map.of()),
                new TemplateWidget("VALUE", "humidity", new WidgetLayout(8, 0, 4, 2), Map.of())
        ));
        when(templateRepository.findById(7L)).thenReturn(Optional.of(template));

        TenantNode boardNode = node(BOARD_NODE_ID, "Khu A", "1.10");
        when(tenantNodeRepository.findById(BOARD_NODE_ID)).thenReturn(Optional.of(boardNode));
        when(tenantNodeRepository.findDescendantIdsIncludingSelf(anyLong(), anyString()))
                .thenReturn(List.of(BOARD_NODE_ID, CHILD_NODE_ID));
        when(tenantNodeRepository.findAllById(anyList()))
                .thenReturn(List.of(boardNode, node(CHILD_NODE_ID, "Chuồng B", "1.10.11")));

        when(metricRepository.findByCode("temperature")).thenReturn(Optional.of(metric(5L, "temperature", "Nhiệt độ")));
        when(metricRepository.findByCode("humidity")).thenReturn(Optional.of(metric(6L, "humidity", "Độ ẩm")));

        when(datastreamRepository.findByTenantNodeIdInAndMetricId(anyList(), eq(5L)))
                .thenReturn(List.of(
                        datastream(100L, BOARD_NODE_ID, "Nhiệt độ"),
                        datastream(101L, CHILD_NODE_ID, "Nhiệt độ")
                ));
        when(datastreamRepository.findByTenantNodeIdInAndMetricId(anyList(), eq(6L)))
                .thenReturn(List.of(datastream(102L, BOARD_NODE_ID, "Độ ẩm")));

        dashboard = new Dashboard();
        dashboard.setId(3L);
        dashboard.setTenantNodeId(BOARD_NODE_ID);
        dashboard.setName("Dashboard");
        when(dashboardService.getOrCreateEntity(BOARD_NODE_ID)).thenReturn(dashboard);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void moiEntryMotOTaiDungToaDoMauKhai() {
        DashboardResponse response = service.applyToNode(BOARD_NODE_ID, 7L);

        // 2 entry -> 2 widget, dù entry nhiệt độ khớp TỚI HAI kênh: chúng gộp vào cùng một ô.
        assertThat(response.widgets()).hasSize(2);
        assertThat(widgetOfType(response, "LINE").layout()).isEqualTo(new WidgetLayout(0, 0, 8, 4));
        assertThat(widgetOfType(response, "VALUE").layout()).isEqualTo(new WidgetLayout(8, 0, 4, 2));
    }

    @Test
    void nhieuKenhCungChiSoGopVaoMotWidget() {
        DashboardResponse response = service.applyToNode(BOARD_NODE_ID, 7L);

        Widget line = widgetOfType(response, "LINE");
        assertThat(line.binding().resolvedDatastreamIds()).containsExactly(100L, 101L);
        // Không tên kênh nào đại diện được cho cả ô -> lấy tên chỉ số.
        assertThat(line.title()).isEqualTo("Nhiệt độ");

        Widget value = widgetOfType(response, "VALUE");
        assertThat(value.binding().resolvedDatastreamIds()).containsExactly(102L);
        assertThat(value.title()).isEqualTo("Độ ẩm");
    }

    @Test
    void apMauGhiDeBoardCu() {
        dashboard.setLayoutJson(new DashboardLayout(List.of(new Widget(
                "cu", "VALUE", new WidgetLayout(0, 0, 3, 2), "Widget cũ", new WidgetBinding(999L, null, null, null), Map.of()))));

        DashboardResponse response = service.applyToNode(BOARD_NODE_ID, 7L);

        assertThat(response.widgets()).hasSize(2);
        assertThat(response.widgets()).noneMatch(w -> "cu".equals(w.id()));
    }

    @Test
    void toaDoVuotBienBiKep() {
        DashboardTemplate wide = new DashboardTemplate();
        wide.setId(9L);
        wide.setLayoutJson(List.of(
                new TemplateWidget("VALUE", "humidity", new WidgetLayout(11, 0, 99, 99), Map.of())));
        when(templateRepositoryRef.findById(9L)).thenReturn(Optional.of(wide));

        DashboardResponse response = service.applyToNode(BOARD_NODE_ID, 9L);

        // VALUE trần 6x4; x bị đẩy vào lưới sau khi biết bề rộng thật.
        assertThat(response.widgets().get(0).layout()).isEqualTo(new WidgetLayout(6, 0, 6, 4));
    }

    private static Widget widgetOfType(DashboardResponse response, String type) {
        return response.widgets().stream()
                .filter(w -> type.equals(w.type()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Không có widget loại " + type));
    }

    private static TenantNode node(long id, String name, String path) {
        TenantNode node = new TenantNode();
        node.setId(id);
        node.setName(name);
        node.setPath(path);
        return node;
    }

    private static Metric metric(long id, String code, String name) {
        Metric metric = new Metric();
        metric.setId(id);
        metric.setCode(code);
        metric.setName(name);
        return metric;
    }

    private static Datastream datastream(long id, long tenantNodeId, String name) {
        Datastream datastream = new Datastream();
        datastream.setId(id);
        datastream.setTenantNodeId(tenantNodeId);
        datastream.setName(name);
        return datastream;
    }
}
