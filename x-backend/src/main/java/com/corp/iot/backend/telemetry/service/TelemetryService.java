package com.corp.iot.backend.telemetry.service;

import com.corp.iot.backend.telemetry.dto.DatastreamTelemetryResponse;
import com.corp.iot.backend.telemetry.dto.PinTelemetryResponse;

import java.util.List;

public interface TelemetryService {

    List<PinTelemetryResponse> getGatewayTelemetry(Long gatewayId, int rangeMinutes);

    /** Mọi kênh của 1 external_source (join qua job) kèm lịch sử — cho trang tổng quan nguồn. */
    List<DatastreamTelemetryResponse> getExternalSourceTelemetry(Long externalSourceId, int rangeMinutes);
}
