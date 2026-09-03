package com.corp.iot.backend.platformdashboard.dto;

import java.time.LocalDate;

public record TrendPointResponse(LocalDate date, long value) {
}
