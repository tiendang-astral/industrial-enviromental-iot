package com.corp.iot.backend.dashboardtemplate.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.tenant.TenantContext;
import com.corp.iot.backend.dashboard.dto.DashboardLayout;
import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboard.dto.Widget;
import com.corp.iot.backend.dashboard.dto.WidgetBinding;
import com.corp.iot.backend.dashboard.dto.WidgetSizeSpec;
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
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardTemplateServiceImpl implements DashboardTemplateService {

    private static final int GRID_COLS = 12;

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

        // Datastream chỉ neo vào SITE (xem DATABASE.md § datastream) — node đang xem dashboard có thể
        // là node gộp, nên phải tìm trên toàn subtree thay vì match đúng tenantNodeId.
        List<Long> subtreeNodeIds = tenantNodeRepository.findDescendantIdsIncludingSelf(TenantContext.getTenantId(), node.getPath());
        List<TenantNode> subtree = tenantNodeRepository.findAllById(subtreeNodeIds);
        Map<Long, String> nodeNames = subtree.stream().collect(Collectors.toMap(TenantNode::getId, TenantNode::getName));
        Map<Long, String> nodePaths = subtree.stream().collect(Collectors.toMap(TenantNode::getId, TenantNode::getPath));

        // GHI ĐÈ: board trở thành đúng bố cục của mẫu. Không gộp với widget cũ — áp mẫu hai lần
        // liên tiếp phải ra cùng một kết quả, mà cộng dồn thì không.
        List<Widget> widgets = new ArrayList<>();

        for (TemplateWidget templateWidget : template.getLayoutJson()) {
            Metric metric = metricRepository.findByCode(templateWidget.metric()).orElse(null);
            if (metric == null) {
                continue;
            }
            List<Datastream> matched = datastreamRepository
                    .findByTenantNodeIdInAndMetricId(subtreeNodeIds, metric.getId()).stream()
                    // Thứ tự cây tổ chức, không phải thứ tự id: hai ô cạnh nhau phải liệt kê chuồng
                    // theo cùng một trật tự, nếu không mắt phải dò lại tên ở từng ô.
                    .sorted(Comparator
                            .comparing((Datastream ds) -> nodePaths.getOrDefault(ds.getTenantNodeId(), ""))
                            .thenComparing(Datastream::getId))
                    .toList();
            if (matched.isEmpty()) {
                continue; // không có kênh nào khớp thì không dựng ô rỗng
            }

            widgets.add(new Widget(
                    UUID.randomUUID().toString(),
                    templateWidget.widgetType(),
                    WidgetSizeSpec.clamp(templateWidget.layout(), templateWidget.widgetType()),
                    widgetTitle(metric, matched, tenantNodeId, nodeNames),
                    WidgetBinding.ofDatastreams(matched.stream().map(Datastream::getId).toList()),
                    templateWidget.config() != null ? templateWidget.config() : Map.of()
            ));
        }

        dashboard.setLayoutJson(new DashboardLayout(widgets));
        dashboardRepository.save(dashboard);
        return dashboardMapper.toResponse(dashboard);
    }

    /**
     * Nhiều kênh thì không tên kênh nào đại diện được cho cả ô — dùng tên chỉ số. Một kênh thì giữ
     * tên kênh, kèm tiền tố đơn vị nếu nó thuộc site con của board.
     */
    private String widgetTitle(Metric metric, List<Datastream> matched, Long boardNodeId, Map<Long, String> nodeNames) {
        if (matched.size() > 1) {
            return metric.getName();
        }
        Datastream datastream = matched.get(0);
        if (datastream.getTenantNodeId().equals(boardNodeId)) {
            return datastream.getName();
        }
        String nodeName = nodeNames.get(datastream.getTenantNodeId());
        return nodeName == null ? datastream.getName() : nodeName + " · " + datastream.getName();
    }

}
