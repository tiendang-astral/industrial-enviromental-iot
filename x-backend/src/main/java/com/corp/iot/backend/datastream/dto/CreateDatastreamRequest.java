package com.corp.iot.backend.datastream.dto;

import com.corp.iot.backend.externalsourcejob.dto.StartFrom;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

// Chỉ dùng để tạo datastream thủ công cho external_source_job (khác gateway_pin tự động) —
// xem DATABASE.md § datastream.
//
// startFrom quyết định có vá lịch sử ngay lúc gắn kênh hay không: job đã chạy rồi thì phần
// trước mốc đọc hiện tại đã bị bỏ, gắn kênh muộn mà không hỏi là để lại lỗ hổng âm thầm.
// Bỏ trống (hoặc NEW_ONLY) = chỉ nhận dữ liệu từ giờ trở đi.
public record CreateDatastreamRequest(
        @NotBlank String name,
        @NotNull Long metricId,
        @NotBlank String sourceField,
        StartFrom startFrom,
        Instant startFromDate
) {
}
