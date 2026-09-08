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

    private Dashboard dashboard;
    private DashboardTemplateServiceImpl service;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);

        DashboardTemplateRepository templateRepository = mock(DashboardTemplateRepository.class);
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
                new TemplateWidget("LINE", "temperature", Map.of()),
                new TemplateWidget("VALUE", "humidity", Map.of())
        ));
        when(templateRepository.findById(7L)).thenReturn(Optional.of(template));

        TenantNode boardNode = node(BOARD_NODE_ID, "Khu A", "1.10");
        when(tenantNodeRepository.findById(BOARD_NODE_ID)).thenReturn(Optional.of(boardNode));
        when(tenantNodeRepository.findDescendantIdsIncludingSelf(anyLong(), anyString()))
                .thenReturn(List.of(BOARD_NODE_ID, CHILD_NODE_ID));
        when(tenantNodeRepository.findAllById(anyList()))
                .thenReturn(List.of(boardNode, node(CHILD_NODE_ID, "Chuồng B", "1.10.11")));

        when(metricRepository.findByCode("temperature")).thenReturn(Optional.of(metric(5L, "temperature")));
        when(metricRepository.findByCode("humidity")).thenReturn(Optional.of(metric(6L, "humidity")));

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
    void moiLoaiWidgetDungCoRieng() {
        DashboardResponse response = service.applyToNode(BOARD_NODE_ID, 7L);

        assertThat(response.widgets()).hasSize(3);
        assertThat(widgetOf(response, 100L).layout()).isEqualTo(new WidgetLayout(0, 0, 6, 4));
        assertThat(widgetOf(response, 101L).layout()).isEqualTo(new WidgetLayout(6, 0, 6, 4));
        // Hàng đầu đã dùng hết 12 cột, nên ô số xuống hàng mới ở đúng chiều cao của LINE (4), không
        // phải chiều cao của chính nó.
        assertThat(widgetOf(response, 102L).layout()).isEqualTo(new WidgetLayout(0, 4, 3, 2));
    }

    @Test
    void kenhCuaSiteConMangTenDonViOTruoc() {
        DashboardResponse response = service.applyToNode(BOARD_NODE_ID, 7L);

        assertThat(widgetOf(response, 100L).title()).isEqualTo("Nhiệt độ");
        assertThat(widgetOf(response, 101L).title()).isEqualTo("Chuồng B · Nhiệt độ");
        assertThat(widgetOf(response, 102L).title()).isEqualTo("Độ ẩm");
    }

    @Test
    void widgetDaCoThiKhongThemLai() {
        dashboard.setLayoutJson(new DashboardLayout(List.of(new Widget(
                "cu", "LINE", new WidgetLayout(0, 0, 6, 4), "Nhiệt độ", new WidgetBinding(100L), Map.of()))));

        DashboardResponse response = service.applyToNode(BOARD_NODE_ID, 7L);

        assertThat(response.widgets()).hasSize(3);
        assertThat(response.widgets().stream().filter(w -> "cu".equals(w.id()))).hasSize(1);
        // Widget mới xếp phía dưới khối đã có, không đè lên nó.
        assertThat(widgetOf(response, 101L).layout().y()).isEqualTo(4);
    }

    private static Widget widgetOf(DashboardResponse response, long datastreamId) {
        return response.widgets().stream()
                .filter(w -> w.binding() != null && datastreamId == w.binding().datastreamId())
                .findFirst()
                .orElseThrow(() -> new AssertionError("Không có widget bind datastream " + datastreamId));
    }

    private static TenantNode node(long id, String name, String path) {
        TenantNode node = new TenantNode();
        node.setId(id);
        node.setName(name);
        node.setPath(path);
        return node;
    }

    private static Metric metric(long id, String code) {
        Metric metric = new Metric();
        metric.setId(id);
        metric.setCode(code);
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
