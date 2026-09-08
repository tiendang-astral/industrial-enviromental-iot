package com.corp.iot.backend.alert.service;

import com.corp.iot.backend.alert.dto.AlertResponse;

import java.util.List;

public interface AlertService {

    List<AlertResponse> list(String status, Long tenantNodeId, int limit);
}
