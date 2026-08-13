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
import com.corp.iot.backend.externalsource.entity.ExternalSource;
import com.corp.iot.backend.externalsource.repository.ExternalSourceRepository;
import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJob;
import com.corp.iot.backend.externalsourcejob.repository.ExternalSourceJobRepository;
import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.repository.MetricRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final ExternalSourceRepository externalSourceRepository;
    private final DatastreamMapper datastreamMapper;
    private final InfluxReadService influxReadService;

    @Override
    public List<DatastreamResponse> list(Long tenantNodeId) {
        return toResponses(datastreamRepository.findByTenantNodeId(tenantNodeId), false);
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
        if (!job.getQueryConfig().valueColumns().contains(request.sourceField())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_SOURCE_FIELD",
                    "sourceField phải khớp query_config.valueColumns của job");
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

        Datastream datastream = new Datastream();
        datastream.setTenantNodeId(source.getTenantNodeId());
        datastream.setName(request.name());
        datastream.setMetricId(metric.getId());
        datastream.setSourceType(SourceType.EXTERNAL_SOURCE_JOB);
        datastream.setSourceId(jobId);
        datastream.setSourceField(request.sourceField());
        datastreamRepository.save(datastream);

        return datastreamMapper.toResponse(datastream, metric, null);
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
                    ReadingPoint latest = includeLatest && d.getSourceType() == SourceType.EXTERNAL_SOURCE_JOB && metric != null
                            ? influxReadService.latestExternal(tenantId, d.getSourceId(), metric.getCode()).orElse(null)
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
