package com.corp.iot.backend.datastream.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.datastream.dto.DatastreamResponse;
import com.corp.iot.backend.datastream.dto.UpdateDatastreamRequest;
import com.corp.iot.backend.datastream.service.DatastreamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    @PutMapping("/api/v1/datastreams/{id}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessDatastream(#id)")
    public ApiResponse<DatastreamResponse> rename(@PathVariable Long id, @Valid @RequestBody UpdateDatastreamRequest request) {
        return ApiResponse.of(datastreamService.rename(id, request));
    }
}
