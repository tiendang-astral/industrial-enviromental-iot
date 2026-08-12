package com.corp.iot.backend.devicestats.service;

import com.corp.iot.backend.devicestats.dto.DeviceSummaryResponse;

import java.util.List;

public interface DeviceStatsService {

    List<DeviceSummaryResponse> listDevices(Long tenantNodeId);
}
