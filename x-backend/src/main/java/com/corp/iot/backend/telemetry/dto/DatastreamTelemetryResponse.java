package com.corp.iot.backend.telemetry.dto;

import java.time.Instant;
import java.util.List;

// Số đo của 1 kênh dữ liệu external, gộp metadata (Postgres) + lịch sử (InfluxDB) — song song
// PinTelemetryResponse của luồng gateway.
public record DatastreamTelemetryResponse(
        Long datastreamId,
        String name,
        String sourceField,
        String metricCode,
        String unit,
        Double latestValue,
        Instant latestMeasuredAt,
        /** Mốc sớm nhất kênh có số đo liền mạch (V13) — FE hiện "Có số đo từ…". */
        Instant oldestReadingAt,
        List<ReadingPointDto> history
) {
}
