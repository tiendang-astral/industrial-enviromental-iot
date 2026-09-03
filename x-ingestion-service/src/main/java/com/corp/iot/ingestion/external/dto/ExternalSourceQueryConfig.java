package com.corp.iot.ingestion.external.dto;

// sql do người dùng viết, bắt buộc chứa :cursor (x-backend validate lúc lưu). timestampColumn là
// tên cột trong KẾT QUẢ, dùng để lấy mốc thời gian và tính cursor mới sau mỗi lần chạy.
public record ExternalSourceQueryConfig(String sql, String timestampColumn) {
}
