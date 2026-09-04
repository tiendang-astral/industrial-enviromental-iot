package com.corp.iot.backend.externalsourcejob.service;

import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.PreviewResponse;
import com.corp.iot.backend.externalsourcejob.dto.CreateExternalSourceJobRequest;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceJobResponse;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceJobRunResponse;
import com.corp.iot.backend.externalsourcejob.dto.UpdateExternalSourceJobRequest;

import java.util.List;

public interface ExternalSourceJobService {

    List<ExternalSourceJobResponse> list(Long externalSourceId);

    ExternalSourceJobResponse create(Long externalSourceId, CreateExternalSourceJobRequest request);

    ExternalSourceJobResponse update(Long id, UpdateExternalSourceJobRequest request);

    void delete(Long id);

    ExternalSourceJobResponse runNow(Long id);

    List<ExternalSourceJobRunResponse> listRuns(Long id, int sinceHours);

    /** Mẫu dòng MỚI NHẤT của job — để quan sát dữ liệu đang chảy về, không phải để soạn câu. */
    PreviewResponse sampleLatest(Long id, int limit);
}
