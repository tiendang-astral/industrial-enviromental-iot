package com.corp.iot.backend.alert.entity;

public enum AlertStatus {
    PENDING,
    ACTIVE,
    RECOVERED,
    /** Quy tắc bị tắt/xoá khi sự cố còn mở — kết thúc, không bao giờ cập nhật thêm. */
    STALE
}
