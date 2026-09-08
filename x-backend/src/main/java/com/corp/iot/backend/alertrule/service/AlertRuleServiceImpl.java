package com.corp.iot.backend.alertrule.service;

import com.corp.iot.backend.alert.service.AlertClosingService;
import com.corp.iot.backend.alertrule.dto.AlertChannelRequest;
import com.corp.iot.backend.alertrule.dto.AlertRuleResponse;
import com.corp.iot.backend.alertrule.dto.CreateAlertRuleRequest;
import com.corp.iot.backend.alertrule.dto.UpdateAlertRuleRequest;
import com.corp.iot.backend.alertrule.entity.AlertChannel;
import com.corp.iot.backend.alertrule.entity.AlertRule;
import com.corp.iot.backend.alertrule.entity.ChannelType;
import com.corp.iot.backend.alertrule.mapper.AlertRuleMapper;
import com.corp.iot.backend.alertrule.repository.AlertChannelRepository;
import com.corp.iot.backend.alertrule.repository.AlertRuleRepository;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.common.tenant.TenantContext;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AlertRuleServiceImpl implements AlertRuleService {

    private final AlertRuleRepository alertRuleRepository;
    private final AlertChannelRepository alertChannelRepository;
    private final MetricRepository metricRepository;
    private final TenantNodeRepository tenantNodeRepository;
    private final AlertRuleMapper alertRuleMapper;
    private final AlertRuleCacheEvictor alertRuleCacheEvictor;
    private final ScopeService scopeService;
    private final AlertConditionValidator alertConditionValidator;
    private final AlertClosingService alertClosingService;

    @Override
    public List<AlertRuleResponse> list(Long tenantNodeId, boolean includeDescendants) {
        List<AlertRule> rules;
        if (tenantNodeId != null) {
            rules = includeDescendants
                    ? alertRuleRepository.findByTenantNodeIdInOrderByNameAsc(subtreeNodeIds(tenantNodeId))
                    : alertRuleRepository.findByTenantNodeIdInOrderByNameAsc(List.of(tenantNodeId));
        } else {
            AppUserPrincipal principal = currentPrincipal();
            Set<Long> accessible = scopeService.resolveAccessibleNodeIds(principal.tenantId(), principal.userId());
            rules = alertRuleRepository.findAllByOrderByNameAsc().stream()
                    .filter(rule -> accessible == null || accessible.contains(rule.getTenantNodeId()))
                    .toList();
        }
        return toResponses(rules);
    }

    @Override
    @Transactional
    public AlertRuleResponse create(CreateAlertRuleRequest request) {
        alertConditionValidator.validate(request.conditions());
        requireNode(request.tenantNodeId());
        requireMetric(request.metricId());

        AlertRule rule = new AlertRule();
        rule.setTenantNodeId(request.tenantNodeId());
        rule.setMetricId(request.metricId());
        rule.setName(request.name());
        rule.setSeverity(request.severity());
        rule.setConditions(request.conditions());
        rule.setDurationSeconds(request.durationSeconds());
        rule.setEnabled(true);
        alertRuleRepository.save(rule);

        replaceChannels(rule.getId(), request.channels());
        alertRuleCacheEvictor.evict(rule);
        return toResponse(rule);
    }

    @Override
    @Transactional
    public AlertRuleResponse update(Long id, UpdateAlertRuleRequest request) {
        alertConditionValidator.validate(request.conditions());
        AlertRule rule = getOrThrow(id);
        rule.setName(request.name());
        rule.setSeverity(request.severity());
        rule.setConditions(request.conditions());
        rule.setDurationSeconds(request.durationSeconds());
        alertRuleRepository.save(rule);

        replaceChannels(id, request.channels());
        alertRuleCacheEvictor.evict(rule);
        return toResponse(rule);
    }

    @Override
    @Transactional
    public AlertRuleResponse updateStatus(Long id, boolean enabled) {
        AlertRule rule = getOrThrow(id);
        rule.setEnabled(enabled);
        alertRuleRepository.save(rule);
        alertRuleCacheEvictor.evict(rule);
        if (!enabled) {
            alertClosingService.closeOpenAlerts(List.of(id));
        }
        return toResponse(rule);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        AlertRule rule = getOrThrow(id);
        alertClosingService.closeOpenAlerts(List.of(id));
        rule.setDeletedAt(Instant.now());
        alertRuleRepository.save(rule);
        alertChannelRepository.deleteByAlertRuleId(id);
        alertRuleCacheEvictor.evict(rule);
    }

    /**
     * Replace toàn bộ kênh thay vì merge — {@code uq_alert_channel} là
     * {@code (alert_rule_id, channel_type, address)} nên merge sẽ phải tự đối chiếu 3 cột để biết
     * dòng nào là "cùng một kênh", trong khi người dùng vốn chỉnh cả danh sách một lượt.
     */
    private void replaceChannels(Long ruleId, List<AlertChannelRequest> requests) {
        alertChannelRepository.deleteByAlertRuleId(ruleId);
        alertChannelRepository.flush();
        for (AlertChannelRequest request : dedupe(requests)) {
            if (request.channelType() == ChannelType.TELEGRAM && isBlank(request.telegramBotToken())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "TELEGRAM_TOKEN_REQUIRED",
                        "Kênh Telegram phải có bot token");
            }
            AlertChannel channel = new AlertChannel();
            channel.setAlertRuleId(ruleId);
            channel.setChannelType(request.channelType());
            channel.setName(request.name());
            channel.setAddress(request.address().trim());
            channel.setTelegramBotToken(
                    request.channelType() == ChannelType.TELEGRAM ? request.telegramBotToken().trim() : null);
            alertChannelRepository.save(channel);
        }
    }

    /** Trùng (loại kênh, địa chỉ) sẽ đụng uq_alert_channel — bỏ bản sau, giống cách dedupe scopes[]. */
    private List<AlertChannelRequest> dedupe(List<AlertChannelRequest> requests) {
        Map<String, AlertChannelRequest> unique = new LinkedHashMap<>();
        for (AlertChannelRequest request : requests) {
            unique.putIfAbsent(request.channelType() + ":" + request.address().trim().toLowerCase(), request);
        }
        return List.copyOf(unique.values());
    }


    private List<AlertRuleResponse> toResponses(List<AlertRule> rules) {
        if (rules.isEmpty()) {
            return List.of();
        }
        Map<Long, Metric> metrics = metricRepository.findAllById(
                        rules.stream().map(AlertRule::getMetricId).distinct().toList()).stream()
                .collect(Collectors.toMap(Metric::getId, Function.identity()));
        Map<Long, List<AlertChannel>> channels = alertChannelRepository
                .findByAlertRuleIdIn(rules.stream().map(AlertRule::getId).toList()).stream()
                .collect(Collectors.groupingBy(AlertChannel::getAlertRuleId));
        return rules.stream()
                .map(rule -> alertRuleMapper.toResponse(
                        rule, metrics.get(rule.getMetricId()), channels.getOrDefault(rule.getId(), List.of())))
                .toList();
    }

    private AlertRuleResponse toResponse(AlertRule rule) {
        return alertRuleMapper.toResponse(
                rule,
                metricRepository.findById(rule.getMetricId()).orElse(null),
                alertChannelRepository.findByAlertRuleId(rule.getId()));
    }

    private List<Long> subtreeNodeIds(Long tenantNodeId) {
        TenantNode node = requireNode(tenantNodeId);
        return tenantNodeRepository.findDescendantIdsIncludingSelf(TenantContext.getTenantId(), node.getPath());
    }

    private TenantNode requireNode(Long tenantNodeId) {
        return tenantNodeRepository.findById(tenantNodeId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NODE_NOT_FOUND", "Không tìm thấy node"));
    }

    private void requireMetric(Long metricId) {
        if (!metricRepository.existsById(metricId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "METRIC_NOT_FOUND", "Không tìm thấy metric");
        }
    }

    private AlertRule getOrThrow(Long id) {
        return alertRuleRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "ALERT_RULE_NOT_FOUND",
                        "Không tìm thấy rule cảnh báo"));
    }

    private AppUserPrincipal currentPrincipal() {
        return (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
