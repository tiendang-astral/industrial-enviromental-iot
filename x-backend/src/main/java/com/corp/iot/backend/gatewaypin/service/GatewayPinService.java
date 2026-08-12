package com.corp.iot.backend.gatewaypin.service;

import com.corp.iot.backend.gatewaypin.dto.CreateGatewayPinRequest;
import com.corp.iot.backend.gatewaypin.dto.GatewayPinResponse;
import com.corp.iot.backend.gatewaypin.dto.UpdateGatewayPinRequest;

import java.util.List;

public interface GatewayPinService {

    List<GatewayPinResponse> list(Long gatewayId);

    GatewayPinResponse create(Long gatewayId, CreateGatewayPinRequest request);

    GatewayPinResponse update(Long gatewayId, Long pinId, UpdateGatewayPinRequest request);
}
