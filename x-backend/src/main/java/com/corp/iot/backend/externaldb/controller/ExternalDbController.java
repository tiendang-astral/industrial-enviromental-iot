package com.corp.iot.backend.externaldb.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.PreviewRequest;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.PreviewResponse;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.SchemaTable;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.TestConnectionRequest;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.TestSavedConnectionRequest;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.TestConnectionResponse;
import com.corp.iot.backend.externaldb.service.ExternalSourceQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// 3 endpoint đọc trực tiếp database ngoài, phục vụ luồng dựng nguồn ở x-frontend: thử kết nối,
// đọc cấu trúc bảng, chạy thử truy vấn. Quyền write như ExternalSourceController (VIEWER không
// được chạy truy vấn tuỳ ý lên database khách hàng).
@RestController
@RequiredArgsConstructor
public class ExternalDbController {

    private final ExternalSourceQueryService externalSourceQueryService;

    // Nguồn chưa lưu — dùng ngay trong form "Thêm nguồn", trước khi có id.
    @PostMapping("/api/v1/external-sources/test-connection")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR')")
    public ApiResponse<TestConnectionResponse> testConnection(@Valid @RequestBody TestConnectionRequest request) {
        if (request.credential() == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "CREDENTIAL_REQUIRED",
                    "Cần tài khoản và mật khẩu để thử kết nối");
        }
        return ApiResponse.of(externalSourceQueryService.testConnection(request.connectionConfig(), request.credential()));
    }

    @PostMapping("/api/v1/external-sources/{sourceId}/test-connection")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessSource(#sourceId)")
    public ApiResponse<TestConnectionResponse> testSavedConnection(
            @PathVariable Long sourceId,
            @Valid @RequestBody(required = false) TestSavedConnectionRequest request) {
        return ApiResponse.of(externalSourceQueryService.testConnection(
                sourceId,
                request != null ? request.connectionConfig() : null,
                request != null ? request.credential() : null));
    }

    @GetMapping("/api/v1/external-sources/{sourceId}/schema")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessSource(#sourceId)")
    public ApiResponse<List<SchemaTable>> schema(@PathVariable Long sourceId) {
        return ApiResponse.of(externalSourceQueryService.listSchema(sourceId));
    }

    @PostMapping("/api/v1/external-sources/{sourceId}/preview")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR') and @nodeScope.canAccessSource(#sourceId)")
    public ApiResponse<PreviewResponse> preview(@PathVariable Long sourceId, @Valid @RequestBody PreviewRequest request) {
        return ApiResponse.of(externalSourceQueryService.preview(sourceId, request.sql(), request.timestampColumn()));
    }
}
