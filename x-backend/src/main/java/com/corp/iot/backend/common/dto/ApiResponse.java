package com.corp.iot.backend.common.dto;

public record ApiResponse<T>(T data, ApiError error) {

    public static <T> ApiResponse<T> of(T data) {
        return new ApiResponse<>(data, null);
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(null, new ApiError(code, message));
    }
}
