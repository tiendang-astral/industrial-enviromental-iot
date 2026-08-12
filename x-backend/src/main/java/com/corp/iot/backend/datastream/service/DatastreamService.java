package com.corp.iot.backend.datastream.service;

import com.corp.iot.backend.datastream.dto.DatastreamResponse;
import com.corp.iot.backend.datastream.dto.UpdateDatastreamRequest;

import java.util.List;

public interface DatastreamService {

    List<DatastreamResponse> list(Long tenantNodeId);

    DatastreamResponse rename(Long id, UpdateDatastreamRequest request);
}
