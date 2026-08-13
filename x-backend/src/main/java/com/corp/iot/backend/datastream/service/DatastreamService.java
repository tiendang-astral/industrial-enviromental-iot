package com.corp.iot.backend.datastream.service;

import com.corp.iot.backend.datastream.dto.CreateDatastreamRequest;
import com.corp.iot.backend.datastream.dto.DatastreamResponse;
import com.corp.iot.backend.datastream.dto.UpdateDatastreamRequest;

import java.util.List;

public interface DatastreamService {

    List<DatastreamResponse> list(Long tenantNodeId);

    List<DatastreamResponse> listByExternalSource(Long externalSourceId);

    DatastreamResponse rename(Long id, UpdateDatastreamRequest request);

    /** Tạo thủ công cho external_source_job — khác gateway_pin tự động (xem DATABASE.md § datastream). */
    DatastreamResponse createForJob(Long jobId, CreateDatastreamRequest request);

    /** Chỉ cho phép khi sourceType=EXTERNAL_SOURCE_JOB — gateway_pin vẫn sở hữu lifecycle datastream của nó. */
    void delete(Long id);
}
