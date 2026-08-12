package com.corp.iot.backend.datastream.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.datastream.dto.DatastreamResponse;
import com.corp.iot.backend.datastream.dto.UpdateDatastreamRequest;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.entity.SourceType;
import com.corp.iot.backend.datastream.mapper.DatastreamMapper;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
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
    private final DatastreamMapper datastreamMapper;

    @Override
    public List<DatastreamResponse> list(Long tenantNodeId) {
        List<Datastream> datastreams = datastreamRepository.findByTenantNodeId(tenantNodeId);

        List<Long> gatewayPinIds = datastreams.stream()
                .filter(d -> d.getSourceType() == SourceType.GATEWAY_PIN)
                .map(Datastream::getSourceId)
                .toList();
        Map<Long, GatewayPin> pinsById = gatewayPinRepository.findAllById(gatewayPinIds).stream()
                .collect(java.util.stream.Collectors.toMap(GatewayPin::getId, Function.identity()));

        List<Long> metricIds = datastreams.stream().map(Datastream::getMetricId).distinct().toList();
        Map<Long, Metric> metricsById = metricRepository.findAllById(metricIds).stream()
                .collect(java.util.stream.Collectors.toMap(Metric::getId, Function.identity()));

        return datastreams.stream()
                .map(d -> datastreamMapper.toResponse(
                        d,
                        metricsById.get(d.getMetricId()),
                        d.getSourceType() == SourceType.GATEWAY_PIN ? pinsById.get(d.getSourceId()) : null))
                .toList();
    }

    @Override
    @Transactional
    public DatastreamResponse rename(Long id, UpdateDatastreamRequest request) {
        Datastream datastream = datastreamRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "DATASTREAM_NOT_FOUND", "Không tìm thấy datastream"));
        datastream.setName(request.name());
        datastreamRepository.save(datastream);

        GatewayPin sourcePin = datastream.getSourceType() == SourceType.GATEWAY_PIN
                ? gatewayPinRepository.findById(datastream.getSourceId()).orElse(null)
                : null;
        Metric metric = metricRepository.findById(datastream.getMetricId()).orElse(null);
        return datastreamMapper.toResponse(datastream, metric, sourcePin);
    }
}
