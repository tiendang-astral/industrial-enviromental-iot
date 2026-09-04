package com.corp.iot.backend.externalsourcejob.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.BackfillEstimateResponse;
import com.corp.iot.backend.externalsourcejob.dto.BackfillDtos.BackfillRequest;
import com.corp.iot.backend.externalsourcejob.dto.BackfillDtos.BackfillResponse;
import com.corp.iot.backend.externalsourcejob.service.ExternalSourceJobBackfillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

// Đọc lại lịch sử cho 1 kênh dữ liệu. VIEWER không được chạy truy vấn tuỳ ý lên database khách
// hàng — cùng quy tắc với ExternalDbController.
@RestController
@RequiredArgsConstructor
public class ExternalSourceJobBackfillController {

    private final ExternalSourceJobBackfillService backfillService;

    @PostMapping("/api/v1/datastreams/{id}/backfill/estimate")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessDatastream(#id)")
    public ApiResponse<BackfillEstimateResponse> estimate(@PathVariable Long id,
                                                          @Valid @RequestBody BackfillRequest request) {
        return ApiResponse.of(backfillService.estimate(id, request));
    }

    @PostMapping("/api/v1/datastreams/{id}/backfill")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessDatastream(#id)")
    public ApiResponse<BackfillResponse> create(@PathVariable Long id,
                                                @Valid @RequestBody BackfillRequest request) {
        return ApiResponse.of(backfillService.create(id, request));
    }

    @GetMapping("/api/v1/datastreams/{id}/backfill")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccessDatastream(#id)")
    public ApiResponse<BackfillResponse> latest(@PathVariable Long id) {
        return ApiResponse.of(backfillService.latest(id));
    }
}
