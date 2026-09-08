package com.corp.iot.backend.externalsourcejob.dto;

import java.util.List;

// Lịch sử chạy của một job, gói theo jobId để trang nguồn lấy mọi job trong một lần gọi.
public record JobRunsResponse(
        Long jobId,
        List<ExternalSourceJobRunResponse> runs
) {
}
