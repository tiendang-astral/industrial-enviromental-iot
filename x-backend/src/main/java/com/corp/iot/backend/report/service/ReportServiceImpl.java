package com.corp.iot.backend.report.service;

import com.corp.iot.backend.alert.entity.Alert;
import com.corp.iot.backend.alert.repository.AlertRepository;
import com.corp.iot.backend.alertrule.entity.AlertRule;
import com.corp.iot.backend.alertrule.entity.AlertSeverity;
import com.corp.iot.backend.alertrule.repository.AlertRuleRepository;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.influx.AggregateFn;
import com.corp.iot.backend.common.influx.AggregationWindow;
import com.corp.iot.backend.common.influx.ChannelStats;
import com.corp.iot.backend.common.influx.ExternalChannel;
import com.corp.iot.backend.common.influx.InfluxReadService;
import com.corp.iot.backend.common.influx.ReadingPoint;
import com.corp.iot.backend.common.influx.SensorChannel;
import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.common.tenant.TenantContext;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.entity.SourceType;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.externalsource.entity.ExternalSource;
import com.corp.iot.backend.externalsource.repository.ExternalSourceRepository;
import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJob;
import com.corp.iot.backend.externalsourcejob.repository.ExternalSourceJobRepository;
import com.corp.iot.backend.gateway.entity.Gateway;
import com.corp.iot.backend.gateway.repository.GatewayRepository;
import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.report.dto.ReportDtos.EnvironmentChannelResponse;
import com.corp.iot.backend.report.dto.ReportDtos.EnvironmentReportResponse;
import com.corp.iot.backend.report.dto.ReportDtos.IncidentCountResponse;
import com.corp.iot.backend.report.dto.ReportDtos.IncidentReportResponse;
import com.corp.iot.backend.report.dto.ReportDtos.IncidentResponse;
import com.corp.iot.backend.telemetry.dto.ReadingPointDto;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    /** Truy vấn chạy đồng bộ trong request thread — hai trần này thay cho việc để người dùng tự treo. */
    private static final int MAX_RANGE_DAYS = 366;
    private static final int MAX_CHANNELS = 50;
    private static final int MAX_INCIDENTS = 5000;

    private final DatastreamRepository datastreamRepository;
    private final GatewayPinRepository gatewayPinRepository;
    private final GatewayRepository gatewayRepository;
    private final ExternalSourceJobRepository externalSourceJobRepository;
    private final ExternalSourceRepository externalSourceRepository;
    private final MetricRepository metricRepository;
    private final TenantNodeRepository tenantNodeRepository;
    private final AlertRepository alertRepository;
    private final AlertRuleRepository alertRuleRepository;
    private final InfluxReadService influxReadService;
    private final ScopeService scopeService;

    @Override
    public EnvironmentReportResponse environment(Instant from, Instant to, List<Long> tenantNodeIds,
                                                 List<Long> metricIds, List<Long> gatewayIds, List<Long> externalSourceIds) {
        validateRange(from, to);
        Long tenantId = currentPrincipal().tenantId();
        Set<Long> nodes = resolveNodes(tenantNodeIds);

        List<Datastream> datastreams = (nodes == null
                ? datastreamRepository.findAll()
                : nodes.isEmpty() ? List.<Datastream>of() : datastreamRepository.findByTenantNodeIdIn(nodes))
                .stream()
                .filter(d -> metricIds == null || metricIds.isEmpty() || metricIds.contains(d.getMetricId()))
                .sorted(Comparator.comparing(Datastream::getTenantNodeId).thenComparing(Datastream::getName))
                .toList();
        datastreams = applySourceFilter(datastreams, gatewayIds, externalSourceIds);

        if (datastreams.size() > MAX_CHANNELS) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "TOO_MANY_DATASTREAMS",
                    "Báo cáo tối đa %d kênh, đang chọn %d — thu hẹp đơn vị hoặc chỉ số".formatted(MAX_CHANNELS, datastreams.size()));
        }
        if (datastreams.isEmpty()) {
            return new EnvironmentReportResponse(from, to, Instant.now(),
                    AggregationWindow.windowSeconds(InfluxReadService.rangeMinutes(from, to)), List.of());
        }

        Map<Long, Metric> metrics = byId(metricRepository.findAllById(
                datastreams.stream().map(Datastream::getMetricId).distinct().toList()), Metric::getId);
        Map<Long, String> nodeNames = nodeNames(datastreams.stream().map(Datastream::getTenantNodeId).distinct().toList());
        Map<Long, Long> alertCounts = alertCounts(from, to, datastreams);

        // Kênh gateway định danh bằng pin, kênh external bằng (job, cột) — hai measurement khác nhau.
        Map<Long, SensorChannel> sensorKeys = new HashMap<>();
        Map<Long, ExternalChannel> externalKeys = new HashMap<>();
        Map<Long, Long> gatewayIdByDatastream = new HashMap<>();
        for (Datastream d : datastreams) {
            if (d.getSourceType() == SourceType.GATEWAY_PIN) {
                gatewayPinRepository.findById(d.getSourceId()).ifPresent(pin -> {
                    sensorKeys.put(d.getId(), new SensorChannel(pin.getGatewayId(), pin.getType().name(), pin.getPinNumber()));
                    gatewayIdByDatastream.put(d.getId(), pin.getGatewayId());
                });
            } else {
                externalKeys.put(d.getId(), new ExternalChannel(d.getSourceId(), d.getSourceField()));
            }
        }

        // Tên gateway / nguồn để FE gom biểu đồ theo chiều đang lọc. Tra theo lô, không tra trong
        // vòng lặp dựng response (N kênh sẽ thành N truy vấn).
        Map<Long, String> gatewayNames = byId(
                gatewayRepository.findAllById(Set.copyOf(gatewayIdByDatastream.values())), Gateway::getId)
                .entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().getName()));
        Map<Long, ExternalSourceJob> jobs = byId(externalSourceJobRepository.findAllById(
                externalKeys.values().stream().map(ExternalChannel::jobId).distinct().toList()),
                ExternalSourceJob::getId);
        Map<Long, String> sourceNames = byId(externalSourceRepository.findAllById(
                jobs.values().stream().map(ExternalSourceJob::getExternalSourceId).distinct().toList()),
                ExternalSource::getId)
                .entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().getName()));

        Map<SensorChannel, ChannelStats> sensorStats =
                influxReadService.summarizeSensor(tenantId, new HashSet<>(sensorKeys.values()), from, to);
        Map<ExternalChannel, ChannelStats> externalStats =
                influxReadService.summarizeExternal(tenantId, new HashSet<>(externalKeys.values()), from, to);
        Map<Long, List<ReadingPointDto>> histories = histories(tenantId, datastreams, metrics, sensorKeys, externalKeys, from, to);

        List<EnvironmentChannelResponse> channels = datastreams.stream().map(d -> {
            Metric metric = metrics.get(d.getMetricId());
            SensorChannel sensorKey = sensorKeys.get(d.getId());
            ChannelStats stats = sensorKey != null
                    ? sensorStats.get(sensorKey)
                    : externalStats.get(externalKeys.get(d.getId()));
            Long gatewayId = gatewayIdByDatastream.get(d.getId());
            ExternalSourceJob job = sensorKey == null ? jobs.get(d.getSourceId()) : null;
            Long externalSourceId = job != null ? job.getExternalSourceId() : null;
            return new EnvironmentChannelResponse(
                    d.getId(),
                    d.getName(),
                    d.getTenantNodeId(),
                    nodeNames.get(d.getTenantNodeId()),
                    metric != null ? metric.getCode() : null,
                    metric != null ? metric.getName() : null,
                    metric != null ? metric.getUnit() : null,
                    d.getSourceType().name(),
                    gatewayId,
                    gatewayId != null ? gatewayNames.get(gatewayId) : null,
                    externalSourceId,
                    externalSourceId != null ? sourceNames.get(externalSourceId) : null,
                    stats != null ? stats.count() : 0,
                    stats != null ? stats.min() : null,
                    stats != null ? stats.max() : null,
                    stats != null ? stats.avg() : null,
                    alertCounts.getOrDefault(d.getId(), 0L),
                    histories.getOrDefault(d.getId(), List.of()));
        }).toList();

        return new EnvironmentReportResponse(from, to, Instant.now(),
                AggregationWindow.windowSeconds(InfluxReadService.rangeMinutes(from, to)), channels);
    }

    @Override
    public IncidentReportResponse incident(Instant from, Instant to, List<Long> tenantNodeIds, String severity,
                                           List<Long> gatewayIds, List<Long> externalSourceIds, List<Long> metricIds) {
        validateRange(from, to);
        Set<Long> nodes = resolveNodes(tenantNodeIds);
        AlertSeverity level = parseSeverity(severity);
        PageRequest cap = PageRequest.of(0, MAX_INCIDENTS);

        // Lọc trong truy vấn chứ không sau khi lấy về: cắt trần 5000 dòng rồi mới bỏ dòng ngoài
        // gateway/nguồn đã chọn thì bộ lọc hẹp sẽ trả về gần như rỗng.
        Set<Long> scopedDatastreams = scopedDatastreamIds(gatewayIds, externalSourceIds, metricIds);
        boolean filterDatastreams = scopedDatastreams != null;
        Collection<Long> datastreamIds = filterDatastreams && !scopedDatastreams.isEmpty()
                ? scopedDatastreams
                : List.of(-1L); // IN không nhận tập rỗng; -1 không khớp id nào

        List<Alert> alerts = nodes == null
                ? alertRepository.findInRange(from, to, level, filterDatastreams, datastreamIds, cap)
                : nodes.isEmpty() ? List.of()
                        : alertRepository.findInRangeByNodes(from, to, nodes, level, filterDatastreams, datastreamIds, cap);

        Map<Long, AlertRule> rules = byId(alertRuleRepository.findAllById(
                alerts.stream().map(Alert::getRuleId).distinct().toList()), AlertRule::getId);
        Map<Long, Datastream> datastreams = byId(datastreamRepository.findAllById(
                alerts.stream().map(Alert::getDatastreamId).filter(Objects::nonNull).distinct().toList()), Datastream::getId);
        Map<Long, Metric> metrics = byId(metricRepository.findAllById(
                rules.values().stream().map(AlertRule::getMetricId).distinct().toList()), Metric::getId);
        Map<Long, String> nodeNames = nodeNames(alerts.stream().map(Alert::getTenantNodeId).distinct().toList());

        List<IncidentResponse> incidents = alerts.stream().map(alert -> {
            AlertRule rule = rules.get(alert.getRuleId());
            Datastream datastream = alert.getDatastreamId() != null ? datastreams.get(alert.getDatastreamId()) : null;
            Metric metric = rule != null ? metrics.get(rule.getMetricId()) : null;
            return new IncidentResponse(
                    alert.getId(),
                    alert.getRuleId(),
                    rule != null ? rule.getName() : null,
                    alert.getTenantNodeId(),
                    nodeNames.get(alert.getTenantNodeId()),
                    alert.getDatastreamId(),
                    datastream != null ? datastream.getName() : null,
                    metric != null ? metric.getCode() : null,
                    metric != null ? metric.getName() : null,
                    metric != null ? metric.getUnit() : null,
                    alert.getSeverity().name(),
                    alert.getStatus().name(),
                    alert.getThresholdSnapshot(),
                    alert.getLastObservedValue(),
                    alert.getStartedAt(),
                    alert.getTriggeredAt(),
                    alert.getRecoveredAt(),
                    alert.getRecoveredAt() != null
                            ? Duration.between(alert.getStartedAt(), alert.getRecoveredAt()).toSeconds()
                            : null);
        }).toList();

        return new IncidentReportResponse(from, to, Instant.now(), incidents.size(), incidents,
                tally(incidents, i -> i.tenantNodeName() != null ? i.tenantNodeName() : "Không rõ đơn vị"),
                tally(incidents, i -> i.metricName() != null ? i.metricName() : "Không rõ chỉ số"));
    }

    /**
     * Lịch sử cho biểu đồ, gom theo (measurement, hàm gộp) — hàm gộp khác nhau theo metric nên không
     * dồn được tất cả vào một câu, nhưng tối đa vẫn chỉ 4 câu truy vấn cho cả báo cáo.
     */
    private Map<Long, List<ReadingPointDto>> histories(
            Long tenantId, List<Datastream> datastreams, Map<Long, Metric> metrics,
            Map<Long, SensorChannel> sensorKeys, Map<Long, ExternalChannel> externalKeys, Instant from, Instant to) {

        Map<AggregateFn, Set<SensorChannel>> sensorByFn = new LinkedHashMap<>();
        Map<AggregateFn, Set<ExternalChannel>> externalByFn = new LinkedHashMap<>();
        for (Datastream d : datastreams) {
            AggregateFn fn = aggregateFn(metrics.get(d.getMetricId()));
            SensorChannel sensorKey = sensorKeys.get(d.getId());
            if (sensorKey != null) {
                sensorByFn.computeIfAbsent(fn, k -> new HashSet<>()).add(sensorKey);
            } else if (externalKeys.containsKey(d.getId())) {
                externalByFn.computeIfAbsent(fn, k -> new HashSet<>()).add(externalKeys.get(d.getId()));
            }
        }

        Map<SensorChannel, List<ReadingPoint>> sensorPoints = new HashMap<>();
        sensorByFn.forEach((fn, channels) ->
                sensorPoints.putAll(influxReadService.historySensorRange(tenantId, channels, from, to, fn)));
        Map<ExternalChannel, List<ReadingPoint>> externalPoints = new HashMap<>();
        externalByFn.forEach((fn, channels) ->
                externalPoints.putAll(influxReadService.historyExternalRange(tenantId, channels, from, to, fn)));

        Map<Long, List<ReadingPointDto>> result = new HashMap<>();
        for (Datastream d : datastreams) {
            SensorChannel sensorKey = sensorKeys.get(d.getId());
            List<ReadingPoint> points = sensorKey != null
                    ? sensorPoints.get(sensorKey)
                    : externalPoints.get(externalKeys.get(d.getId()));
            if (points != null) {
                result.put(d.getId(), points.stream()
                        .map(p -> new ReadingPointDto(p.value(), p.measuredAt()))
                        .toList());
            }
        }
        return result;
    }

    private List<Datastream> applySourceFilter(List<Datastream> datastreams, List<Long> gatewayIds,
                                               List<Long> externalSourceIds) {
        Set<Long> allowed = scopedDatastreamIds(gatewayIds, externalSourceIds, null);
        if (allowed == null) {
            return datastreams;
        }
        return datastreams.stream().filter(d -> allowed.contains(d.getId())).toList();
    }

    /**
     * Tập id kênh sau khi lọc; null = không lọc chiều nào.
     *
     * Gateway và nguồn ngoài HỢP nhau (một kênh chỉ neo vào chân gateway hoặc vào job của nguồn, nên
     * giao hai tập luôn rỗng), còn chỉ số thì GIAO vào kết quả đó — "kênh của gateway này, mà là
     * nhiệt độ". Hai phép khác nhau nên không gộp chung vòng lặp được.
     */
    private Set<Long> scopedDatastreamIds(List<Long> gatewayIds, List<Long> externalSourceIds,
                                          List<Long> metricIds) {
        boolean byGateway = gatewayIds != null && !gatewayIds.isEmpty();
        boolean bySource = externalSourceIds != null && !externalSourceIds.isEmpty();
        boolean byMetric = metricIds != null && !metricIds.isEmpty();
        if (!byGateway && !bySource && !byMetric) {
            return null;
        }

        Set<Long> allowed = null;
        if (byGateway || bySource) {
            Set<Long> union = new HashSet<>();
            if (bySource) {
                datastreamRepository.findByExternalSourceIdIn(externalSourceIds)
                        .forEach(d -> union.add(d.getId()));
            }
            if (byGateway) {
                // datastream.source_id của kênh gateway là id của PIN, không phải id gateway.
                Set<Long> pinIds = gatewayPinRepository.findByGatewayIdIn(gatewayIds).stream()
                        .map(GatewayPin::getId)
                        .collect(Collectors.toSet());
                datastreamRepository.findAll().stream()
                        .filter(d -> d.getSourceType() == SourceType.GATEWAY_PIN && pinIds.contains(d.getSourceId()))
                        .forEach(d -> union.add(d.getId()));
            }
            allowed = union;
        }
        if (byMetric) {
            Set<Long> matched = datastreamRepository.findAll().stream()
                    .filter(d -> metricIds.contains(d.getMetricId()))
                    .map(Datastream::getId)
                    .collect(Collectors.toSet());
            allowed = allowed == null ? matched : allowed.stream().filter(matched::contains).collect(Collectors.toSet());
        }
        return allowed;
    }

    private Map<Long, Long> alertCounts(Instant from, Instant to, List<Datastream> datastreams) {
        List<Long> ids = datastreams.stream().map(Datastream::getId).toList();
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : alertRepository.countByDatastreamInRange(from, to, ids)) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
    }

    /** null = thấy hết trong tenant; rỗng = không thấy gì. Giao của scope user với subtree đã chọn. */
    private Set<Long> resolveNodes(List<Long> requested) {
        AppUserPrincipal principal = currentPrincipal();
        Set<Long> accessible = scopeService.resolveAccessibleNodeIds(principal.tenantId(), principal.userId());
        if (requested == null || requested.isEmpty()) {
            return accessible;
        }
        Set<Long> subtree = new HashSet<>();
        for (Long nodeId : requested) {
            TenantNode node = tenantNodeRepository.findById(nodeId)
                    .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NODE_NOT_FOUND", "Không tìm thấy đơn vị"));
            subtree.addAll(tenantNodeRepository.findDescendantIdsIncludingSelf(TenantContext.getTenantId(), node.getPath()));
        }
        if (accessible != null) {
            subtree.retainAll(accessible);
        }
        return subtree;
    }

    private Map<Long, String> nodeNames(List<Long> nodeIds) {
        return tenantNodeRepository.findAllById(nodeIds).stream()
                .collect(Collectors.toMap(TenantNode::getId, TenantNode::getName));
    }

    private List<IncidentCountResponse> tally(List<IncidentResponse> incidents, Function<IncidentResponse, String> key) {
        Map<String, List<IncidentResponse>> grouped = incidents.stream()
                .collect(Collectors.groupingBy(key, LinkedHashMap::new, Collectors.toList()));
        List<IncidentCountResponse> rows = new ArrayList<>();
        grouped.forEach((label, list) -> rows.add(new IncidentCountResponse(
                label,
                list.size(),
                list.stream().filter(i -> AlertSeverity.CRITICAL.name().equals(i.severity())).count(),
                list.stream().filter(i -> AlertSeverity.WARNING.name().equals(i.severity())).count())));
        rows.sort(Comparator.comparingLong(IncidentCountResponse::total).reversed());
        return rows;
    }

    // Kênh có ngưỡng trên thì gộp bằng MAX — khớp quy ước của TelemetryServiceImpl, để biểu đồ báo
    // cáo không phẳng hơn biểu đồ trên dashboard của cùng kênh.
    private AggregateFn aggregateFn(Metric metric) {
        return metric != null && metric.getMaxValue() != null ? AggregateFn.MAX : AggregateFn.MEAN;
    }

    private void validateRange(Instant from, Instant to) {
        if (!to.isAfter(from)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_RANGE", "Thời điểm kết thúc phải sau thời điểm bắt đầu");
        }
        if (Duration.between(from, to).toDays() > MAX_RANGE_DAYS) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_RANGE",
                    "Khoảng báo cáo tối đa %d ngày".formatted(MAX_RANGE_DAYS));
        }
    }

    private AlertSeverity parseSeverity(String severity) {
        if (severity == null || severity.isBlank()) {
            return null;
        }
        try {
            return AlertSeverity.valueOf(severity.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_SEVERITY", "Mức độ phải là WARNING hoặc CRITICAL");
        }
    }

    private <T> Map<Long, T> byId(List<T> items, Function<T, Long> id) {
        return items.stream().collect(Collectors.toMap(id, Function.identity(), (a, b) -> a));
    }

    private AppUserPrincipal currentPrincipal() {
        return (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
