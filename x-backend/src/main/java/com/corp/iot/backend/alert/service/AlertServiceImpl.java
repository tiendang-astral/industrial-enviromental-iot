package com.corp.iot.backend.alert.service;

import com.corp.iot.backend.alert.dto.AlertResponse;
import com.corp.iot.backend.alert.entity.Alert;
import com.corp.iot.backend.alert.entity.AlertStatus;
import com.corp.iot.backend.alert.mapper.AlertMapper;
import com.corp.iot.backend.alert.repository.AlertRepository;
import com.corp.iot.backend.alertrule.entity.AlertRule;
import com.corp.iot.backend.alertrule.repository.AlertRuleRepository;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.common.tenant.TenantContext;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AlertServiceImpl implements AlertService {

    /** Trạng thái "đang mở" theo uq_alert_open — mặc định của trang Cảnh báo. */
    private static final Set<AlertStatus> OPEN_STATUSES = Set.of(AlertStatus.PENDING, AlertStatus.ACTIVE);

    private final AlertRepository alertRepository;
    private final AlertRuleRepository alertRuleRepository;
    private final DatastreamRepository datastreamRepository;
    private final MetricRepository metricRepository;
    private final TenantNodeRepository tenantNodeRepository;
    private final AlertMapper alertMapper;
    private final ScopeService scopeService;

    @Override
    public List<AlertResponse> list(String status, Long tenantNodeId, int limit) {
        Pageable newestFirst = PageRequest.of(0, Math.clamp(limit, 1, 2000));
        Set<AlertStatus> statuses = resolveStatuses(status);
        Set<Long> visible = visibleNodeIds(tenantNodeId);

        List<Alert> alerts;
        if (statuses == null && visible == null) {
            alerts = alertRepository.findByOrderByStartedAtDesc(newestFirst);
        } else if (statuses == null) {
            alerts = visible.isEmpty()
                    ? List.of()
                    : alertRepository.findByTenantNodeIdInOrderByStartedAtDesc(visible, newestFirst);
        } else if (visible == null) {
            alerts = alertRepository.findByStatusInOrderByStartedAtDesc(statuses, newestFirst);
        } else {
            alerts = visible.isEmpty()
                    ? List.of()
                    : alertRepository.findByStatusInAndTenantNodeIdInOrderByStartedAtDesc(
                            statuses, visible, newestFirst);
        }
        return enrich(alerts);
    }

    /** null = không lọc trạng thái. */
    private Set<AlertStatus> resolveStatuses(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return "OPEN".equalsIgnoreCase(status) ? OPEN_STATUSES : Set.of(parseStatus(status));
    }

    /** null = thấy hết trong tenant; ngược lại là giao của scope user với subtree node đang lọc. */
    private Set<Long> visibleNodeIds(Long tenantNodeId) {
        AppUserPrincipal principal = (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Set<Long> accessible = scopeService.resolveAccessibleNodeIds(principal.tenantId(), principal.userId());
        if (tenantNodeId == null) {
            return accessible;
        }
        TenantNode node = tenantNodeRepository.findById(tenantNodeId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NODE_NOT_FOUND", "Không tìm thấy node"));
        Set<Long> subtree = Set.copyOf(
                tenantNodeRepository.findDescendantIdsIncludingSelf(TenantContext.getTenantId(), node.getPath()));
        if (accessible == null) {
            return subtree;
        }
        return subtree.stream().filter(accessible::contains).collect(Collectors.toSet());
    }

    private List<AlertResponse> enrich(List<Alert> alerts) {
        if (alerts.isEmpty()) {
            return List.of();
        }
        Map<Long, AlertRule> rules = alertRuleRepository.findAllById(
                        alerts.stream().map(Alert::getRuleId).distinct().toList()).stream()
                .collect(Collectors.toMap(AlertRule::getId, Function.identity()));
        Map<Long, Datastream> datastreams = datastreamRepository.findAllById(
                        alerts.stream().map(Alert::getDatastreamId).filter(java.util.Objects::nonNull).distinct().toList())
                .stream()
                .collect(Collectors.toMap(Datastream::getId, Function.identity()));
        Map<Long, Metric> metrics = metricRepository.findAllById(
                        rules.values().stream().map(AlertRule::getMetricId).distinct().toList()).stream()
                .collect(Collectors.toMap(Metric::getId, Function.identity()));

        return alerts.stream()
                .map(alert -> {
                    AlertRule rule = rules.get(alert.getRuleId());
                    return alertMapper.toResponse(
                            alert,
                            rule,
                            alert.getDatastreamId() != null ? datastreams.get(alert.getDatastreamId()) : null,
                            rule != null ? metrics.get(rule.getMetricId()) : null);
                })
                .toList();
    }

    private AlertStatus parseStatus(String status) {
        try {
            return AlertStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_ALERT_STATUS",
                    "Trạng thái phải là OPEN, PENDING, ACTIVE hoặc RECOVERED");
        }
    }
}
