package com.corp.iot.backend.platformdashboard.dto;

import com.corp.iot.backend.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

import java.util.Arrays;

public enum TrendRange {
    SEVEN_DAYS(7, "7d"),
    THIRTY_DAYS(30, "30d"),
    NINETY_DAYS(90, "90d");

    private final int days;
    private final String param;

    TrendRange(int days, String param) {
        this.days = days;
        this.param = param;
    }

    public int getDays() {
        return days;
    }

    public static TrendRange fromParam(String param) {
        return Arrays.stream(values())
                .filter(r -> r.param.equals(param))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.BAD_REQUEST, "INVALID_RANGE", "range phải là 7d, 30d hoặc 90d"));
    }
}
