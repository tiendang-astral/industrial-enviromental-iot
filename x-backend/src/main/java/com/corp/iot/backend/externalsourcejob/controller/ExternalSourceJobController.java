package com.corp.iot.backend.externalsourcejob.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.externalsourcejob.dto.CreateExternalSourceJobRequest;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceJobResponse;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceJobRunResponse;
import com.corp.iot.backend.externalsourcejob.dto.UpdateExternalSourceJobRequest;
import com.corp.iot.backend.externalsourcejob.service.ExternalSourceJobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ExternalSourceJobController {

    private final ExternalSourceJobService externalSourceJobService;

    @GetMapping("/api/v1/external-sources/{sourceId}/jobs")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccessSource(#sourceId)")
    public ApiResponse<List<ExternalSourceJobResponse>> list(@PathVariable Long sourceId) {
        return ApiResponse.of(externalSourceJobService.list(sourceId));
    }

    @PostMapping("/api/v1/external-sources/{sourceId}/jobs")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessSource(#sourceId)")
    public ApiResponse<ExternalSourceJobResponse> create(@PathVariable Long sourceId, @Valid @RequestBody CreateExternalSourceJobRequest request) {
        return ApiResponse.of(externalSourceJobService.create(sourceId, request));
    }

    @PutMapping("/api/v1/external-source-jobs/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessJob(#id)")
    public ApiResponse<ExternalSourceJobResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateExternalSourceJobRequest request) {
        return ApiResponse.of(externalSourceJobService.update(id, request));
    }

    // Không gọi RPC sang x-ingestion-service — chỉ kéo next_run_at về hiện tại, sweep nhặt trong ≤15s.
    @PostMapping("/api/v1/external-source-jobs/{id}/run-now")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessJob(#id)")
    public ApiResponse<ExternalSourceJobResponse> runNow(@PathVariable Long id) {
        return ApiResponse.of(externalSourceJobService.runNow(id));
    }

    @GetMapping("/api/v1/external-source-jobs/{id}/runs")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccessJob(#id)")
    public ApiResponse<List<ExternalSourceJobRunResponse>> runs(
            @PathVariable Long id,
            @RequestParam(defaultValue = "12") int sinceHours) {
        return ApiResponse.of(externalSourceJobService.listRuns(id, sinceHours));
    }

    @DeleteMapping("/api/v1/external-source-jobs/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessJob(#id)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        externalSourceJobService.delete(id);
        return ResponseEntity.ok().build();
    }
}
