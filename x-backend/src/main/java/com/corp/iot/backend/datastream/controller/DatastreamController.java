package com.corp.iot.backend.datastream.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.datastream.dto.CreateDatastreamRequest;
import com.corp.iot.backend.datastream.dto.DatastreamResponse;
import com.corp.iot.backend.datastream.dto.UpdateDatastreamRequest;
import com.corp.iot.backend.datastream.service.DatastreamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class DatastreamController {

    private final DatastreamService datastreamService;

    @GetMapping("/api/v1/tenant-nodes/{nodeId}/datastreams")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccess(#nodeId)")
    public ApiResponse<List<DatastreamResponse>> list(@PathVariable Long nodeId) {
        return ApiResponse.of(datastreamService.list(nodeId));
    }

    @GetMapping("/api/v1/external-sources/{sourceId}/datastreams")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccessSource(#sourceId)")
    public ApiResponse<List<DatastreamResponse>> listByExternalSource(@PathVariable Long sourceId) {
        return ApiResponse.of(datastreamService.listByExternalSource(sourceId));
    }

    @PutMapping("/api/v1/datastreams/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessDatastream(#id)")
    public ApiResponse<DatastreamResponse> rename(@PathVariable Long id, @Valid @RequestBody UpdateDatastreamRequest request) {
        return ApiResponse.of(datastreamService.rename(id, request));
    }

    @PostMapping("/api/v1/external-source-jobs/{jobId}/datastreams")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessJob(#jobId)")
    public ApiResponse<DatastreamResponse> createForJob(@PathVariable Long jobId, @Valid @RequestBody CreateDatastreamRequest request) {
        return ApiResponse.of(datastreamService.createForJob(jobId, request));
    }

    @DeleteMapping("/api/v1/datastreams/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessDatastream(#id)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        datastreamService.delete(id);
        return ResponseEntity.ok().build();
    }
}
