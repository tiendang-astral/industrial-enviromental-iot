package com.corp.iot.backend.externalsourcejob.service;

import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.BackfillEstimateResponse;
import com.corp.iot.backend.externalsourcejob.dto.BackfillDtos.BackfillRequest;
import com.corp.iot.backend.externalsourcejob.dto.BackfillDtos.BackfillResponse;

public interface ExternalSourceJobBackfillService {

    /** Đếm trước khi chạy — người dùng biết mình đang bấm vào bao nhiêu dòng. */
    BackfillEstimateResponse estimate(Long datastreamId, BackfillRequest request);

    BackfillResponse create(Long datastreamId, BackfillRequest request);

    /** Tác vụ gần nhất của kênh, null nếu chưa vá lần nào — FE poll để hiện tiến độ. */
    BackfillResponse latest(Long datastreamId);
}
