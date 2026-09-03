package com.corp.iot.backend.externalsourcejob.dto;

// Quyết định giá trị đầu tiên của incremental_cursor khi tạo job — trước V12 luôn NULL nên job
// mới luôn kéo toàn bộ lịch sử mà người dùng không được chọn.
public enum StartFrom {
    NEW_ONLY,
    ALL_HISTORY,
    FROM_DATE
}
