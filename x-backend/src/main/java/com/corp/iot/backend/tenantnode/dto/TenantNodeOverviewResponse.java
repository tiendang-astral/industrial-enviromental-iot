package com.corp.iot.backend.tenantnode.dto;

import java.util.List;

// Flatten toàn bộ subtree của 1 node (không phân cấp BRANCH/PRODUCTION_AREA giữa chừng) —
// dùng cho card-grid Dashboard khi vào node không phải SITE (xem DATABASE.md § dashboard).
public record TenantNodeOverviewResponse(
        List<ExternalSourceSummary> sources,
        List<SiteSummary> sites
) {
    public record ExternalSourceSummary(Long id, String name, Long tenantNodeId, String tenantNodePath) {
    }

    public record SiteSummary(Long id, String name, String path) {
    }
}
