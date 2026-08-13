package com.corp.iot.backend.dashboardtemplate.service;

import com.corp.iot.backend.common.exception.BusinessException;
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
import com.corp.iot.backend.dashboardtemplate.dto.DashboardTemplateResponse;
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
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardTemplateServiceImpl implements DashboardTemplateService {

    private static final int DEFAULT_WIDGET_W = 4;
    private static final int DEFAULT_WIDGET_H = 3;
    private static final int GRID_COLS = 12;
    private static final int COLS_PER_ROW = GRID_COLS / DEFAULT_WIDGET_W;

    private final DashboardTemplateRepository dashboardTemplateRepository;
    private final DashboardTemplateMapper dashboardTemplateMapper;
    private final DatastreamRepository datastreamRepository;
    private final MetricRepository metricRepository;
    private final TenantNodeRepository tenantNodeRepository;
    private final DashboardService dashboardService;
    private final DashboardRepository dashboardRepository;
    private final DashboardMapper dashboardMapper;

    @Override
    public List<DashboardTemplateResponse> list() {
        return dashboardTemplateRepository.findAll().stream().map(dashboardTemplateMapper::toResponse).toList();
    }

    @Override
    @Transactional
    public DashboardResponse applyToNode(Long tenantNodeId, Long templateId) {
        DashboardTemplate template = dashboardTemplateRepository.findById(templateId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "TEMPLATE_NOT_FOUND", "Không tìm thấy template"));
        TenantNode node = tenantNodeRepository.findById(tenantNodeId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NODE_NOT_FOUND", "Không tìm thấy node"));
        Dashboard dashboard = dashboardService.getOrCreateEntity(tenantNodeId);

        // Datastream chỉ neo vào SITE (xem DATABASE.md § datastream) — node đang xem
        // dashboard có thể là node gộp (BRANCH/PRODUCTION_AREA/TENANT_ROOT), nên phải
        // tìm datastream trên toàn subtree thay vì match đúng tenantNodeId, nếu không
        // áp template ở node gộp sẽ không tạo được widget nào (bug đã gặp).
        List<Long> subtreeNodeIds = tenantNodeRepository.findDescendantIdsIncludingSelf(TenantContext.getTenantId(), node.getPath());

        List<Widget> widgets = new ArrayList<>(dashboard.getLayoutJson().widgets());
        Set<String> existingKeys = widgets.stream().map(this::widgetKey).collect(Collectors.toSet());
        int startY = widgets.stream().mapToInt(w -> w.layout().y() + w.layout().h()).max().orElse(0);
        int addedCount = 0;

        for (TemplateWidget templateWidget : template.getLayoutJson()) {
            Metric metric = metricRepository.findByCode(templateWidget.metric()).orElse(null);
            if (metric == null) {
                continue;
            }
            List<Datastream> matched = datastreamRepository.findByTenantNodeIdInAndMetricId(subtreeNodeIds, metric.getId());
            for (Datastream datastream : matched) {
                String key = templateWidget.widgetType() + ":" + datastream.getId();
                if (!existingKeys.add(key)) {
                    continue; // đã có widget này (type + datastreamId) — không ghi đè
                }
                int col = addedCount % COLS_PER_ROW;
                int row = addedCount / COLS_PER_ROW;
                widgets.add(new Widget(
                        UUID.randomUUID().toString(),
                        templateWidget.widgetType(),
                        new WidgetLayout(col * DEFAULT_WIDGET_W, startY + row * DEFAULT_WIDGET_H, DEFAULT_WIDGET_W, DEFAULT_WIDGET_H),
                        datastream.getName(),
                        new WidgetBinding(datastream.getId()),
                        templateWidget.config() != null ? templateWidget.config() : Map.of()
                ));
                addedCount++;
            }
        }

        dashboard.setLayoutJson(new DashboardLayout(widgets));
        dashboardRepository.save(dashboard);
        return dashboardMapper.toResponse(dashboard);
    }

    private String widgetKey(Widget widget) {
        return widget.type() + ":" + (widget.binding() != null ? widget.binding().datastreamId() : null);
    }
}
