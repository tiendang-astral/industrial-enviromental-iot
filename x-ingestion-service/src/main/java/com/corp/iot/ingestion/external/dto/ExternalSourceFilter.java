package com.corp.iot.ingestion.external.dto;

public record ExternalSourceFilter(String column, String operator, String value) {
}
