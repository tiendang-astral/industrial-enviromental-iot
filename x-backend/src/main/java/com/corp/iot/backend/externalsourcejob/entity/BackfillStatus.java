package com.corp.iot.backend.externalsourcejob.entity;

// Khác JobRunStatus ở PENDING: tác vụ vá do x-backend tạo ra và nằm chờ cho tới khi
// x-ingestion-service nhặt lên (3 service không gọi trực tiếp nhau, xem ARCHITECTURE.md).
public enum BackfillStatus {
    PENDING,
    RUNNING,
    SUCCESS,
    FAILED
}
