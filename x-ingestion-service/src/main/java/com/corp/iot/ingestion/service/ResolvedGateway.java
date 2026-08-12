package com.corp.iot.ingestion.service;

public record ResolvedGateway(Long gatewayId, Long tenantId, Long tenantNodeId) {

    String toCacheValue() {
        return gatewayId + "|" + tenantId + "|" + (tenantNodeId == null ? "" : tenantNodeId);
    }

    static ResolvedGateway fromCacheValue(String value) {
        String[] parts = value.split("\\|", -1);
        Long tenantNodeId = parts[2].isEmpty() ? null : Long.valueOf(parts[2]);
        return new ResolvedGateway(Long.valueOf(parts[0]), Long.valueOf(parts[1]), tenantNodeId);
    }
}
