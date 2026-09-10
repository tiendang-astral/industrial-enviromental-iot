package com.corp.iot.backend.alertrulegroup.service;

import com.corp.iot.backend.alert.service.AlertClosingService;
import com.corp.iot.backend.alertrule.dto.AlertChannelRequest;
import com.corp.iot.backend.alertrule.entity.AlertChannel;
import com.corp.iot.backend.alertrule.entity.AlertRule;
import com.corp.iot.backend.alertrule.entity.ChannelType;
import com.corp.iot.backend.alertrule.mapper.AlertRuleMapper;
import com.corp.iot.backend.alertrule.repository.AlertChannelRepository;
import com.corp.iot.backend.alertrule.repository.AlertRuleRepository;
import com.corp.iot.backend.alertrule.service.AlertRuleCacheEvictor;
import com.corp.iot.backend.alertrule.service.AlertConditionValidator;
import com.corp.iot.backend.alertrulegroup.dto.AlertRuleGroupDtos.AlertRuleGroupResponse;
import com.corp.iot.backend.alertrulegroup.dto.AlertRuleGroupDtos.GroupRuleResponse;
import com.corp.iot.backend.alertrulegroup.dto.AlertRuleGroupDtos.MetricRuleInput;
import com.corp.iot.backend.alertrulegroup.dto.AlertRuleGroupDtos.SaveAlertRuleGroupRequest;
import com.corp.iot.backend.alertrulegroup.entity.AlertRuleGroup;
import com.corp.iot.backend.alertrulegroup.repository.AlertRuleGroupRepository;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.datastream.entity.SourceType;
import com.corp.iot.backend.externalsource.repository.ExternalSourceRepository;
import com.corp.iot.backend.gateway.repository.GatewayRepository;
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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Trải phẳng N đơn vị × M chỉ số thành N×M {@code alert_rule} trong MỘT transaction — hỏng giữa
 * chừng thì không tạo dòng nào, khác hẳn việc để frontend bắn N×M request rồi tự dọn khi lỗi.
 */
@Service
@RequiredArgsConstructor
public class AlertRuleGroupServiceImpl implements AlertRuleGroupService {

    private final AlertRuleGroupRepository alertRuleGroupRepository;
    private final AlertRuleRepository alertRuleRepository;
    private final AlertChannelRepository alertChannelRepository;
    private final MetricRepository metricRepository;
    private final TenantNodeRepository tenantNodeRepository;
    private final AlertRuleMapper alertRuleMapper;
    private final AlertRuleCacheEvictor alertRuleCacheEvictor;
    private final AlertConditionValidator alertConditionValidator;
    private final AlertClosingService alertClosingService;
    private final ExternalSourceRepository externalSourceRepository;
    private final GatewayRepository gatewayRepository;
    private final ScopeService scopeService;

    @Override
    public List<AlertRuleGroupResponse> list() {
        List<AlertRuleGroup> groups = alertRuleGroupRepository.findAllByOrderByNameAsc();
        if (groups.isEmpty()) {
            return List.of();
        }
        Map<Long, List<AlertRule>> rulesByGroup = alertRuleRepository
                .findByGroupIdIn(groups.stream().map(AlertRuleGroup::getId).toList()).stream()
                .collect(Collectors.groupingBy(AlertRule::getGroupId));

        Set<Long> accessible = accessibleNodeIds();
        return groups.stream()
                .map(group -> toResponse(group, rulesByGroup.getOrDefault(group.getId(), List.of())))
                // Nhóm chỉ hiện khi user thấy được ÍT NHẤT một đơn vị của nó — nhóm mà mọi đơn vị
                // đều ngoài phạm vi thì với user này nó không tồn tại.
                .filter(response -> accessible == null
                        || response.tenantNodeIds().stream().anyMatch(accessible::contains))
                .toList();
    }

    @Override
    @Transactional
    public AlertRuleGroupResponse create(SaveAlertRuleGroupRequest request) {
        validate(request);

        AlertRuleGroup group = new AlertRuleGroup();
        group.setName(request.name());
        group.setSeverity(request.severity());
        group.setSourceType(request.sourceType());
        group.setGatewayIds(scopeIds(request, SourceType.GATEWAY_PIN));
        group.setExternalSourceIds(scopeIds(request, SourceType.EXTERNAL_SOURCE_JOB));
        alertRuleGroupRepository.save(group);

        List<AlertRule> created = new ArrayList<>();
        for (Long nodeId : topMostNodeIds(request.tenantNodeIds())) {
            for (MetricRuleInput metric : request.metrics()) {
                created.add(persistRule(new AlertRule(), group, nodeId, metric));
            }
        }
        created.forEach(rule -> replaceChannels(rule.getId(), request.channels()));
        created.forEach(alertRuleCacheEvictor::evict);
        return toResponse(group, created);
    }

    /**
     * Cập nhật theo kiểu đối chiếu chứ không xoá-tạo-lại: rule bị xoá thì alert đang mở của nó mồ
     * côi và không bao giờ chuyển được sang RECOVERED. Giữ nguyên rule mà cặp (đơn vị, chỉ số) vẫn
     * còn được chọn thì alert đang chạy vẫn đóng lại đúng.
     */
    @Override
    @Transactional
    public AlertRuleGroupResponse update(Long id, SaveAlertRuleGroupRequest request) {
        validate(request);
        AlertRuleGroup group = getOrThrow(id);
        group.setName(request.name());
        group.setSeverity(request.severity());
        group.setSourceType(request.sourceType());
        group.setGatewayIds(scopeIds(request, SourceType.GATEWAY_PIN));
        group.setExternalSourceIds(scopeIds(request, SourceType.EXTERNAL_SOURCE_JOB));
        alertRuleGroupRepository.save(group);

        Map<String, AlertRule> existing = alertRuleRepository.findByGroupId(id).stream()
                .collect(Collectors.toMap(
                        rule -> key(rule.getTenantNodeId(), rule.getMetricId()), Function.identity(), (a, b) -> a));

        List<AlertRule> survivors = new ArrayList<>();
        for (Long nodeId : topMostNodeIds(request.tenantNodeIds())) {
            for (MetricRuleInput metric : request.metrics()) {
                AlertRule rule = existing.remove(key(nodeId, metric.metricId()));
                survivors.add(persistRule(rule != null ? rule : new AlertRule(), group, nodeId, metric));
            }
        }

        // Còn sót trong `existing` = cặp (đơn vị, chỉ số) đã bị bỏ chọn.
        for (AlertRule removed : existing.values()) {
            removed.setDeletedAt(Instant.now());
            alertRuleRepository.save(removed);
            alertChannelRepository.deleteByAlertRuleId(removed.getId());
            alertRuleCacheEvictor.evict(removed);
        }
        alertClosingService.closeOpenAlerts(existing.values().stream().map(AlertRule::getId).toList());

        survivors.forEach(rule -> replaceChannels(rule.getId(), request.channels()));
        survivors.forEach(alertRuleCacheEvictor::evict);
        return toResponse(group, survivors);
    }

    @Override
    @Transactional
    public AlertRuleGroupResponse updateStatus(Long id, boolean enabled) {
        AlertRuleGroup group = getOrThrow(id);
        List<AlertRule> rules = alertRuleRepository.findByGroupId(id);
        for (AlertRule rule : rules) {
            rule.setEnabled(enabled);
            alertRuleRepository.save(rule);
            alertRuleCacheEvictor.evict(rule);
        }
        // Engine không resolve rule đã tắt nữa, nên alert đang mở sẽ đứng im vĩnh viễn nếu không
        // đóng ở đây — trang Cảnh báo hiện sự cố giả và widget đếm sai.
        if (!enabled) {
            alertClosingService.closeOpenAlerts(rules.stream().map(AlertRule::getId).toList());
        }
        return toResponse(group, rules);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        AlertRuleGroup group = getOrThrow(id);
        List<AlertRule> children = alertRuleRepository.findByGroupId(id);
        alertClosingService.closeOpenAlerts(children.stream().map(AlertRule::getId).toList());
        for (AlertRule rule : children) {
            rule.setDeletedAt(Instant.now());
            alertRuleRepository.save(rule);
            alertChannelRepository.deleteByAlertRuleId(rule.getId());
            alertRuleCacheEvictor.evict(rule);
        }
        group.setDeletedAt(Instant.now());
        alertRuleGroupRepository.save(group);
    }

    private AlertRule persistRule(AlertRule rule, AlertRuleGroup group, Long nodeId, MetricRuleInput metric) {
        rule.setGroupId(group.getId());
        rule.setTenantNodeId(nodeId);
        rule.setMetricId(metric.metricId());
        // Tên rule con = tên nhóm: bảng ở FE hiện nhóm, còn email cảnh báo đã kèm tên kênh dữ liệu
        // nên biết ngay đơn vị nào. Ghép thêm đơn vị + chỉ số chỉ làm tiêu đề mail dài ra.
        rule.setName(group.getName());
        rule.setSeverity(group.getSeverity());
        rule.setSourceType(group.getSourceType());
        rule.setGatewayIds(group.getGatewayIds());
        rule.setExternalSourceIds(group.getExternalSourceIds());
        rule.setConditions(metric.conditions());
        rule.setDurationSeconds(metric.durationSeconds());
        if (rule.getId() == null) {
            rule.setEnabled(true);
        }
        alertRuleRepository.save(rule);
        return rule;
    }

    private void validate(SaveAlertRuleGroupRequest request) {
        validateScope(request);
        Set<Long> accessible = accessibleNodeIds();
        for (Long nodeId : distinct(request.tenantNodeIds())) {
            if (!tenantNodeRepository.existsById(nodeId)) {
                throw new BusinessException(HttpStatus.NOT_FOUND, "NODE_NOT_FOUND", "Không tìm thấy đơn vị");
            }
            if (accessible != null && !accessible.contains(nodeId)) {
                throw new BusinessException(HttpStatus.FORBIDDEN, "NODE_OUT_OF_SCOPE",
                        "Đơn vị nằm ngoài phạm vi được phân quyền");
            }
        }
        Set<Long> seenMetrics = new LinkedHashSet<>();
        for (MetricRuleInput metric : request.metrics()) {
            if (!seenMetrics.add(metric.metricId())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "DUPLICATE_METRIC",
                        "Mỗi chỉ số chỉ được cấu hình một lần trong nhóm");
            }
            if (!metricRepository.existsById(metric.metricId())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "METRIC_NOT_FOUND", "Không tìm thấy chỉ số");
            }
            alertConditionValidator.validate(metric.conditions());
        }
    }

    /**
     * Phạm vi đích danh của quy tắc. Danh sách rỗng bị coi là KHÔNG hợp lệ chứ không phải "tất cả":
     * form bắt chọn ít nhất một, còn `null` (không giới hạn) chỉ tồn tại ở quy tắc tạo trước V24.
     */
    private void validateScope(SaveAlertRuleGroupRequest request) {
        List<Long> gateways = distinct(request.gatewayIds());
        List<Long> sources = distinct(request.externalSourceIds());

        // Danh sách chỉ có nghĩa với đúng loại của nó. Chặn ở đây thay vì để DB ném ck_*: lỗi check
        // constraint không nói được cho người dùng là sai chỗ nào.
        boolean gatewayScope = request.sourceType() == SourceType.GATEWAY_PIN;
        if (gatewayScope ? !sources.isEmpty() : !gateways.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "SCOPE_TYPE_MISMATCH",
                    "Phạm vi đã chọn không khớp loại nguồn của quy tắc");
        }
        if (gatewayScope ? gateways.isEmpty() : sources.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "SCOPE_REQUIRED",
                    gatewayScope ? "Chọn ít nhất một thiết bị" : "Chọn ít nhất một nguồn dữ liệu");
        }

        // existsById đi qua @TenantId nên bản ghi của tenant khác ra false — không cần so tenant tay.
        for (Long gatewayId : gateways) {
            if (!gatewayRepository.existsById(gatewayId)) {
                throw new BusinessException(HttpStatus.NOT_FOUND, "GATEWAY_NOT_FOUND", "Không tìm thấy thiết bị");
            }
        }
        for (Long sourceId : sources) {
            if (!externalSourceRepository.existsById(sourceId)) {
                throw new BusinessException(HttpStatus.NOT_FOUND, "EXTERNAL_SOURCE_NOT_FOUND",
                        "Không tìm thấy nguồn dữ liệu");
            }
        }
    }

    /** Danh sách của đúng loại đang chọn, đã bỏ trùng; loại còn lại luôn null để giữ ck_* của DB. */
    private List<Long> scopeIds(SaveAlertRuleGroupRequest request, SourceType forType) {
        if (request.sourceType() != forType) {
            return null;
        }
        return distinct(forType == SourceType.GATEWAY_PIN ? request.gatewayIds() : request.externalSourceIds());
    }

    private void replaceChannels(Long ruleId, List<AlertChannelRequest> requests) {
        alertChannelRepository.deleteByAlertRuleId(ruleId);
        alertChannelRepository.flush();
        Map<String, AlertChannelRequest> unique = new LinkedHashMap<>();
        for (AlertChannelRequest request : requests) {
            unique.putIfAbsent(request.channelType() + ":" + request.address().trim().toLowerCase(), request);
        }
        for (AlertChannelRequest request : unique.values()) {
            if (request.channelType() == ChannelType.TELEGRAM
                    && (request.telegramBotToken() == null || request.telegramBotToken().isBlank())) {
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

    private AlertRuleGroupResponse toResponse(AlertRuleGroup group, List<AlertRule> rules) {
        Map<Long, Metric> metrics = metricRepository.findAllById(
                        rules.stream().map(AlertRule::getMetricId).distinct().toList()).stream()
                .collect(Collectors.toMap(Metric::getId, Function.identity()));

        List<GroupRuleResponse> ruleResponses = rules.stream()
                .map(rule -> {
                    Metric metric = metrics.get(rule.getMetricId());
                    return new GroupRuleResponse(
                            rule.getId(), rule.getTenantNodeId(), rule.getMetricId(),
                            metric != null ? metric.getCode() : null,
                            metric != null ? metric.getUnit() : null,
                            rule.getSourceType() != null ? rule.getSourceType().name() : null,
                            rule.getGatewayIds(), rule.getExternalSourceIds(),
                            rule.getConditions(), rule.getDurationSeconds(), rule.isEnabled());
                })
                .toList();

        // Kênh giống hệt nhau trên mọi rule con, đọc của rule đầu là đủ đại diện cho nhóm.
        List<AlertChannel> channels = rules.isEmpty()
                ? List.of()
                : alertChannelRepository.findByAlertRuleId(rules.getFirst().getId());

        return new AlertRuleGroupResponse(
                group.getId(),
                group.getName(),
                group.getSeverity().name(),
                group.getSourceType() != null ? group.getSourceType().name() : null,
                group.getGatewayIds(), group.getExternalSourceIds(),
                rules.stream().map(AlertRule::getTenantNodeId).distinct().toList(),
                rules.stream().map(AlertRule::getMetricId).distinct().toList(),
                !rules.isEmpty() && rules.stream().allMatch(AlertRule::isEnabled),
                rules.size(),
                ruleResponses,
                channels.stream().map(alertRuleMapper::toChannelResponse).toList(),
                group.getCreatedAt(),
                group.getUpdatedAt());
    }

    private Set<Long> accessibleNodeIds() {
        AppUserPrincipal principal =
                (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return scopeService.resolveAccessibleNodeIds(principal.tenantId(), principal.userId());
    }

    /**
     * Bỏ node nào đã có tổ tiên cũng được chọn.
     *
     * Ô chọn tổ chức tick cha là tick luôn mọi con, nên danh sách gửi lên thường chứa cả cha lẫn
     * con. Mà rule vốn đã phủ toàn bộ subtree (xem AlertRuleRepository.findApplicable), nên tạo
     * thêm rule cho node con là tạo rule TRÙNG: một reading của site đó khớp cả hai, sinh hai
     * alert và gửi hai email cho cùng một lần vi phạm.
     */
    private List<Long> topMostNodeIds(List<Long> ids) {
        List<TenantNode> selected = ids.stream().distinct()
                .map(id -> tenantNodeRepository.findById(id)
                        .orElseThrow(() -> new BusinessException(
                                HttpStatus.NOT_FOUND, "NODE_NOT_FOUND", "Không tìm thấy đơn vị")))
                .toList();
        return selected.stream()
                .filter(node -> selected.stream().noneMatch(other ->
                        !other.getId().equals(node.getId())
                                && node.getPath().startsWith(other.getPath() + ".")))
                .map(TenantNode::getId)
                .toList();
    }

    /** null-safe: `tenantNodeIds` luôn có, còn danh sách phạm vi thì vắng mặt khi không dùng tới. */
    private List<Long> distinct(List<Long> ids) {
        return ids == null ? List.of() : ids.stream().filter(Objects::nonNull).distinct().toList();
    }

    private String key(Long nodeId, Long metricId) {
        return nodeId + ":" + metricId;
    }

    private AlertRuleGroup getOrThrow(Long id) {
        return alertRuleGroupRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "ALERT_RULE_GROUP_NOT_FOUND",
                        "Không tìm thấy nhóm quy tắc"));
    }
}
