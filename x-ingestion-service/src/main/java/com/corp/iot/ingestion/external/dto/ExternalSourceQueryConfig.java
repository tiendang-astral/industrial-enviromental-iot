package com.corp.iot.ingestion.external.dto;

import java.util.List;

public record ExternalSourceQueryConfig(String table, String timestampColumn, List<String> valueColumns) {
}
