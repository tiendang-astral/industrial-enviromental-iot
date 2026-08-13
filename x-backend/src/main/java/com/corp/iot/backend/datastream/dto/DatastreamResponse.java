package com.corp.iot.backend.datastream.dto;

import java.time.Instant;

public record DatastreamResponse(
        Long id,
        Long tenantNodeId,
        String name,
        Long metricId,
        String metricCode,
        String metricUnit,
        String sourceType,
        Long sourceId,
        String sourceField,
        Long sourceGatewayId,
        String sourcePinType,
        Integer sourcePinNumber,
        Boolean sourceEnabled,
        // Chỉ populate ở DatastreamController.listByExternalSource (đọc InfluxDB, tốn round-trip
        // nên không query ở list(tenantNodeId) — nơi đó chỉ cần binding cho dialog "Thêm widget").
        Double latestValue,
        Instant latestMeasuredAt
) {
}
