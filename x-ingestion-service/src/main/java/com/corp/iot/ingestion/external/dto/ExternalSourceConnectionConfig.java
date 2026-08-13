package com.corp.iot.ingestion.external.dto;

// Mapped trực tiếp vào cột external_source.connection_config (jsonb) — bản sao riêng của
// x-ingestion-service (khác x-backend, CONVENTIONS.md § chấp nhận duplicate giữa 3 service).
public record ExternalSourceConnectionConfig(String host, Integer port, String database, String sslMode) {
}
