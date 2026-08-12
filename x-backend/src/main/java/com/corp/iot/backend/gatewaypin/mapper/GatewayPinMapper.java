package com.corp.iot.backend.gatewaypin.mapper;

import com.corp.iot.backend.gatewaypin.dto.GatewayPinResponse;
import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import org.springframework.stereotype.Component;

@Component
public class GatewayPinMapper {

    public GatewayPinResponse toResponse(GatewayPin pin) {
        return new GatewayPinResponse(
                pin.getId(),
                pin.getGatewayId(),
                pin.getDirection().name(),
                pin.getType().name(),
                pin.getName(),
                pin.getMetricId(),
                pin.getPinNumber(),
                pin.getPowerDesiredState() != null ? pin.getPowerDesiredState().name() : null,
                pin.getPowerReportedState() != null ? pin.getPowerReportedState().name() : null,
                pin.isEnabled()
        );
    }
}
