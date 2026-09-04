package com.corp.iot.backend.gateway.service;

import com.corp.iot.backend.gateway.dto.CreateGatewayRequest;
import com.corp.iot.backend.gateway.dto.GatewayResponse;
import com.corp.iot.backend.gateway.dto.UpdateGatewayRequest;

import java.util.List;

public interface GatewayService {

    /** includeDescendants=true: gateway của cả subtree — widget SWITCH ở board node gộp cần tới. */
    List<GatewayResponse> list(Long tenantNodeId, boolean includeDescendants);

    GatewayResponse create(CreateGatewayRequest request);

    GatewayResponse update(Long id, UpdateGatewayRequest request);

    void delete(Long id);
}
