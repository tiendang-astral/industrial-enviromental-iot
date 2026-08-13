package com.corp.iot.backend.externalsource.service;

import com.corp.iot.backend.externalsource.dto.CreateExternalSourceRequest;
import com.corp.iot.backend.externalsource.dto.ExternalSourceResponse;
import com.corp.iot.backend.externalsource.dto.UpdateExternalSourceRequest;

import java.util.List;

public interface ExternalSourceService {

    List<ExternalSourceResponse> list(Long tenantNodeId);

    /** Toàn bộ nguồn trong scope user, không giới hạn theo 1 node — dùng cho trang "Nguồn dữ liệu". */
    List<ExternalSourceResponse> listAll();

    ExternalSourceResponse create(Long tenantNodeId, CreateExternalSourceRequest request);

    ExternalSourceResponse update(Long id, UpdateExternalSourceRequest request);

    void delete(Long id);
}
