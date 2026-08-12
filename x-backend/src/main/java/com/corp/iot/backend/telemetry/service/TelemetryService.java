package com.corp.iot.backend.telemetry.service;

import com.corp.iot.backend.telemetry.dto.PinTelemetryResponse;

import java.util.List;

public interface TelemetryService {

    List<PinTelemetryResponse> getGatewayTelemetry(Long gatewayId, int rangeMinutes);
}
