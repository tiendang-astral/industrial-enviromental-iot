package com.corp.iot.backend.gatewaypin.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.entity.SourceType;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.gateway.entity.Gateway;
import com.corp.iot.backend.gateway.repository.GatewayRepository;
import com.corp.iot.backend.gatewaypin.dto.CreateGatewayPinRequest;
import com.corp.iot.backend.gatewaypin.dto.GatewayPinResponse;
import com.corp.iot.backend.gatewaypin.dto.UpdateGatewayPinRequest;
import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.gatewaypin.entity.PinDirection;
import com.corp.iot.backend.gatewaypin.entity.PinType;
import com.corp.iot.backend.gatewaypin.mapper.GatewayPinMapper;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class GatewayPinServiceImpl implements GatewayPinService {

    private static final Set<PinType> INPUT_TYPES = Set.of(PinType.AI, PinType.DI);
    private static final Set<PinType> OUTPUT_TYPES = Set.of(PinType.DO, PinType.AO);

    private final GatewayPinRepository gatewayPinRepository;
    private final GatewayRepository gatewayRepository;
    private final GatewayPinMapper gatewayPinMapper;
    private final DatastreamRepository datastreamRepository;

    @Override
    public List<GatewayPinResponse> list(Long gatewayId) {
        return gatewayPinRepository.findByGatewayId(gatewayId).stream()
                .map(gatewayPinMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public GatewayPinResponse create(Long gatewayId, CreateGatewayPinRequest request) {
        Gateway gateway = gatewayRepository.findById(gatewayId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "GATEWAY_NOT_FOUND", "Không tìm thấy gateway"));
        PinDirection direction = parseDirection(request.direction());
        PinType type = parseType(request.type());
        validateTypeMatchesDirection(direction, type);
        validateDirectionFields(direction, request.metricId());

        if (gatewayPinRepository.existsByGatewayIdAndTypeAndPinNumber(gatewayId, type, request.pinNumber())) {
            throw new BusinessException(HttpStatus.CONFLICT, "PIN_ALREADY_EXISTS", "Pin này đã tồn tại trên gateway");
        }

        GatewayPin pin = new GatewayPin();
        pin.setGatewayId(gatewayId);
        pin.setDirection(direction);
        pin.setType(type);
        pin.setName(request.name());
        pin.setMetricId(direction == PinDirection.INPUT ? request.metricId() : null);
        pin.setPinNumber(request.pinNumber());
        gatewayPinRepository.save(pin);

        // 1 gateway_pin INPUT -> 1 datastream, tạo cùng transaction (xem DATABASE.md §
        // datastream) — bỏ qua nếu gateway mồ côi (tenant_node_id NULL, không thể xảy ra
        // qua path tạo gateway hiện tại nhưng giữ nhất quán với backfill V6).
        if (direction == PinDirection.INPUT && gateway.getTenantNodeId() != null) {
            Datastream datastream = new Datastream();
            datastream.setTenantNodeId(gateway.getTenantNodeId());
            datastream.setName(gateway.getName() + " - " + pin.getName());
            datastream.setMetricId(pin.getMetricId());
            datastream.setSourceType(SourceType.GATEWAY_PIN);
            datastream.setSourceId(pin.getId());
            datastreamRepository.save(datastream);
        }

        return gatewayPinMapper.toResponse(pin);
    }

    @Override
    @Transactional
    public GatewayPinResponse update(Long gatewayId, Long pinId, UpdateGatewayPinRequest request) {
        GatewayPin pin = gatewayPinRepository.findById(pinId)
                .filter(p -> p.getGatewayId().equals(gatewayId))
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "PIN_NOT_FOUND", "Không tìm thấy pin"));
        if (request.name() != null) {
            pin.setName(request.name());
        }
        if (request.enabled() != null) {
            pin.setEnabled(request.enabled());
        }
        gatewayPinRepository.save(pin);
        return gatewayPinMapper.toResponse(pin);
    }

    private void validateTypeMatchesDirection(PinDirection direction, PinType type) {
        boolean valid = (direction == PinDirection.INPUT && INPUT_TYPES.contains(type))
                || (direction == PinDirection.OUTPUT && OUTPUT_TYPES.contains(type));
        if (!valid) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_GATEWAY_PIN",
                    "type %s không khớp direction %s".formatted(type, direction));
        }
    }

    private void validateDirectionFields(PinDirection direction, Long metricId) {
        if (direction == PinDirection.INPUT && metricId == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_GATEWAY_PIN", "INPUT pin bắt buộc có metricId");
        }
        if (direction == PinDirection.OUTPUT && metricId != null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_GATEWAY_PIN", "OUTPUT pin không được có metricId");
        }
    }

    private PinDirection parseDirection(String raw) {
        try {
            return PinDirection.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_GATEWAY_PIN", "direction không hợp lệ");
        }
    }

    private PinType parseType(String raw) {
        try {
            return PinType.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_GATEWAY_PIN", "type không hợp lệ");
        }
    }
}
