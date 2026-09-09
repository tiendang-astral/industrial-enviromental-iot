package com.corp.iot.backend.report.dto;

import com.corp.iot.backend.alertrule.dto.AlertConditionGroup;
import com.corp.iot.backend.telemetry.dto.ReadingPointDto;

import java.time.Instant;
import java.util.List;

/** DTO của hai báo cáo Phase 8 — gom một file vì chúng chỉ được dùng cùng nhau. */
public final class ReportDtos {

    private ReportDtos() {
    }

    public record EnvironmentReportResponse(
            Instant from,
            Instant to,
            Instant generatedAt,
            /** Bề rộng cửa sổ gộp mẫu của `history` — để chú thích "mỗi điểm = trung bình N phút". */
            int bucketSeconds,
            List<EnvironmentChannelResponse> channels
    ) {
    }

    public record EnvironmentChannelResponse(
            Long datastreamId,
            String datastreamName,
            Long tenantNodeId,
            String tenantNodeName,
            String metricCode,
            String metricName,
            String metricUnit,
            /** Định danh nguồn gốc — để FE gom biểu đồ theo đúng chiều người dùng đang lọc. */
            String sourceType,
            Long gatewayId,
            String gatewayName,
            Long externalSourceId,
            String externalSourceName,
            long sampleCount,
            Double minValue,
            Double maxValue,
            Double avgValue,
            /**
             * Đếm từ bảng `alert`, không tính lại từ InfluxDB — tính lại cho ra con số KHÁC với
             * cảnh báo đã thực sự bắn. Hệ quả: khoảng trước khi quy tắc được tạo hiện 0.
             */
            long alertCount,
            List<ReadingPointDto> history
    ) {
    }

    public record IncidentReportResponse(
            Instant from,
            Instant to,
            Instant generatedAt,
            int totalCount,
            List<IncidentResponse> incidents,
            List<IncidentCountResponse> byNode,
            List<IncidentCountResponse> byMetric
    ) {
    }

    public record IncidentResponse(
            Long id,
            Long ruleId,
            String ruleName,
            Long tenantNodeId,
            String tenantNodeName,
            Long datastreamId,
            String datastreamName,
            String metricCode,
            String metricName,
            String metricUnit,
            String severity,
            String status,
            AlertConditionGroup thresholdSnapshot,
            Double lastObservedValue,
            Instant startedAt,
            Instant triggeredAt,
            Instant recoveredAt,
            /** null = chưa kết thúc (còn mở, hoặc bỏ dở vì quy tắc bị tắt). */
            Long durationSeconds
    ) {
    }

    public record IncidentCountResponse(String label, long total, long critical, long warning) {
    }
}
