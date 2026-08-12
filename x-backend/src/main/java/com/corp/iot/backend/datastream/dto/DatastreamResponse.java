package com.corp.iot.backend.datastream.dto;

public record DatastreamResponse(
        Long id,
        Long tenantNodeId,
        String name,
        Long metricId,
        String metricCode,
        String metricUnit,
        String sourceType,
        Long sourceId,
        Long sourceGatewayId,
        String sourcePinType,
        Integer sourcePinNumber,
        Boolean sourceEnabled
) {
}
