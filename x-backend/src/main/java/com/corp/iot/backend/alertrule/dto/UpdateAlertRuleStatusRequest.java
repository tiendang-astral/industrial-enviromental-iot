package com.corp.iot.backend.alertrule.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateAlertRuleStatusRequest(@NotNull Boolean enabled) {
}
