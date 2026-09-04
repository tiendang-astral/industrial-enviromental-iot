package com.corp.iot.backend.datastream.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.influx.InfluxReadService;
import com.corp.iot.backend.common.influx.ReadingPoint;
import com.corp.iot.backend.common.tenant.TenantContext;
import com.corp.iot.backend.datastream.dto.CreateDatastreamRequest;
import com.corp.iot.backend.datastream.dto.DatastreamResponse;
import com.corp.iot.backend.datastream.dto.UpdateDatastreamRequest;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.entity.SourceType;
import com.corp.iot.backend.datastream.mapper.DatastreamMapper;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.PreviewColumn;
import com.corp.iot.backend.externaldb.service.ExternalSourceQueryService;
import com.corp.iot.backend.externalsource.entity.ExternalSource;
import com.corp.iot.backend.externalsource.repository.ExternalSourceRepository;
import com.corp.iot.backend.externalsourcejob.dto.BackfillDtos.BackfillRequest;
import com.corp.iot.backend.externalsourcejob.dto.StartFrom;
import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJob;
import com.corp.iot.backend.externalsourcejob.repository.ExternalSourceJobRepository;
import com.corp.iot.backend.externalsourcejob.service.ExternalSourceJobBackfillService;
import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class DatastreamServiceImpl implements DatastreamService {

    private final DatastreamRepository datastreamRepository;
    private final GatewayPinRepository gatewayPinRepository;
    private final MetricRepository metricRepository;
    private final ExternalSourceJobRepository externalSourceJobRepository;
    private final ExternalSourceJobBackfillService backfillService;
    private final ExternalSourceRepository externalSourceRepository;
    private final ExternalSourceQueryService externalSourceQueryService;
    private final TenantNodeRepository tenantNodeRepository;
    private final DatastreamMapper datastreamMapper;
    private final InfluxReadService influxReadService;

    @Override
    public List<DatastreamResponse> list(Long tenantNodeId, boolean includeDescendants) {
        if (!includeDescendants) {
            return toResponses(datastreamRepository.findByTenantNodeId(tenantNodeId), false);
        }
        // Datastream chỉ neo vào SITE, nên board ở node gộp (BRANCH/PRODUCTION_AREA/TENANT_ROOT)
        // phải quét cả subtree mới có gì để bind — cùng cách applyToNode đang làm.
        TenantNode node = tenantNodeRepository.findById(tenantNodeId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NODE_NOT_FOUND", "Không tìm thấy node"));
        List<Long> subtreeNodeIds = tenantNodeRepository.findDescendantIdsIncludingSelf(TenantContext.getTenantId(), node.getPath());
        return toResponses(datastreamRepository.findByTenantNodeIdIn(subtreeNodeIds), false);
    }

    @Override
    public List<DatastreamResponse> listByExternalSource(Long externalSourceId) {
        // includeLatest=true — trang chi tiết External Source cần hiện giá trị hiện tại +
        // cập nhật gần nhất cho từng datastream (đọc InfluxDB, chấp nhận round-trip thêm vì
        // list này thường nhỏ — vài field/job).
        return toResponses(datastreamRepository.findByExternalSourceId(externalSourceId), true);
    }

    @Override
    @Transactional
    public DatastreamResponse rename(Long id, UpdateDatastreamRequest request) {
        Datastream datastream = getOrThrow(id);
        datastream.setName(request.name());
        datastreamRepository.save(datastream);

        GatewayPin sourcePin = datastream.getSourceType() == SourceType.GATEWAY_PIN
                ? gatewayPinRepository.findById(datastream.getSourceId()).orElse(null)
                : null;
        Metric metric = metricRepository.findById(datastream.getMetricId()).orElse(null);
        return datastreamMapper.toResponse(datastream, metric, sourcePin);
    }

    @Override
    @Transactional
    public DatastreamResponse createForJob(Long jobId, CreateDatastreamRequest request) {
        ExternalSourceJob job = externalSourceJobRepository.findById(jobId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "JOB_NOT_FOUND", "Không tìm thấy job"));
        // Từ V12 không còn valueColumns khai sẵn — cột hợp lệ là cột thật trong kết quả truy vấn,
        // nên chạy thử rồi đối chiếu (xem ExternalSourceJobServiceImpl.requireBoundColumnsPresent).
        boolean fieldExists = externalSourceQueryService
                .preview(job.getExternalSourceId(), job.getQueryConfig().sql(), job.getQueryConfig().timestampColumn())
                .columns().stream()
                .map(PreviewColumn::name)
                .anyMatch(name -> name.equalsIgnoreCase(request.sourceField()));
        if (!fieldExists) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_SOURCE_FIELD",
                    "Kết quả truy vấn của job không có cột \"" + request.sourceField() + "\"");
        }
        if (datastreamRepository.existsBySourceTypeAndSourceIdAndSourceField(SourceType.EXTERNAL_SOURCE_JOB, jobId, request.sourceField())) {
            throw new BusinessException(HttpStatus.CONFLICT, "DATASTREAM_FIELD_TAKEN", "Field này đã được gắn vào 1 datastream khác");
        }
        Metric metric = metricRepository.findById(request.metricId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "METRIC_NOT_FOUND", "Không tìm thấy metric"));

        // tenant_node_id của datastream = node của external_source cha (qua job), không phải
        // node của job — job không có tenant_node riêng, chỉ external_source mới có.
        ExternalSource source = externalSourceRepository.findById(job.getExternalSourceId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "SOURCE_NOT_FOUND", "Không tìm thấy nguồn dữ liệu"));

        if (datastreamRepository.existsByTenantNodeIdAndNameIgnoreCase(source.getTenantNodeId(), request.name())) {
            throw new BusinessException(HttpStatus.CONFLICT, "DATASTREAM_NAME_TAKEN",
                    "Đơn vị này đã có kênh tên \"" + request.name() + "\" — đặt tên khác");
        }

        Datastream datastream = new Datastream();
        datastream.setTenantNodeId(source.getTenantNodeId());
        datastream.setName(request.name());
        datastream.setMetricId(metric.getId());
        datastream.setSourceType(SourceType.EXTERNAL_SOURCE_JOB);
        datastream.setSourceId(jobId);
        datastream.setSourceField(request.sourceField());
        // Kênh bắt đầu nhận dữ liệu từ mốc đọc hiện tại của job trở đi — mọi thứ trước đó là
        // lỗ hổng, và startFrom bên dưới là chỗ người dùng quyết định có vá nó không.
        datastream.setOldestReadingAt(parseCursor(job.getIncrementalCursor()));
        datastreamRepository.save(datastream);

        if (needsBackfill(job, request)) {
            backfillService.create(datastream.getId(),
                    new BackfillRequest(request.startFrom(), request.startFromDate()));
        }

        return datastreamMapper.toResponse(datastream, metric, null);
    }

    // Job chưa chạy lần nào thì không có gì bị bỏ lỡ — không làm phiền người dùng bằng một
    // tác vụ vá rỗng.
    private boolean needsBackfill(ExternalSourceJob job, CreateDatastreamRequest request) {
        return job.getLastRunAt() != null
                && request.startFrom() != null
                && request.startFrom() != StartFrom.NEW_ONLY;
    }

    private Instant parseCursor(String cursor) {
        try {
            return cursor != null && !cursor.isBlank() ? Instant.parse(cursor) : Instant.now();
        } catch (Exception e) {
            return Instant.now();
        }
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Datastream datastream = getOrThrow(id);
        if (datastream.getSourceType() != SourceType.EXTERNAL_SOURCE_JOB) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "DATASTREAM_DELETE_NOT_ALLOWED",
                    "Chỉ xóa được datastream tạo từ external_source_job");
        }
        // Không có cột deleted_at ở bảng này (xem entity Datastream) — hard delete.
        datastreamRepository.delete(datastream);
    }

    private List<DatastreamResponse> toResponses(List<Datastream> datastreams, boolean includeLatest) {
        List<Long> gatewayPinIds = datastreams.stream()
                .filter(d -> d.getSourceType() == SourceType.GATEWAY_PIN)
                .map(Datastream::getSourceId)
                .toList();
        Map<Long, GatewayPin> pinsById = gatewayPinRepository.findAllById(gatewayPinIds).stream()
                .collect(java.util.stream.Collectors.toMap(GatewayPin::getId, Function.identity()));

        List<Long> metricIds = datastreams.stream().map(Datastream::getMetricId).distinct().toList();
        Map<Long, Metric> metricsById = metricRepository.findAllById(metricIds).stream()
                .collect(java.util.stream.Collectors.toMap(Metric::getId, Function.identity()));

        Long tenantId = includeLatest ? TenantContext.getTenantId() : null;

        return datastreams.stream()
                .map(d -> {
                    Metric metric = metricsById.get(d.getMetricId());
                    GatewayPin sourcePin = d.getSourceType() == SourceType.GATEWAY_PIN ? pinsById.get(d.getSourceId()) : null;
                    ReadingPoint latest = includeLatest && d.getSourceType() == SourceType.EXTERNAL_SOURCE_JOB
                            ? influxReadService.latestExternal(tenantId, d.getSourceId(), d.getSourceField()).orElse(null)
                            : null;
                    return datastreamMapper.toResponse(d, metric, sourcePin, latest);
                })
                .toList();
    }

    private Datastream getOrThrow(Long id) {
        return datastreamRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "DATASTREAM_NOT_FOUND", "Không tìm thấy datastream"));
    }
}
