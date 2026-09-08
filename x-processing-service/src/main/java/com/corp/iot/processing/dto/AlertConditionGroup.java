package com.corp.iot.processing.dto;

import java.util.List;

/**
 * Nội dung {@code alert_rule.conditions_json}: một nhóm điều kiện với một phép nối duy nhất
 * ({@code AND} hoặc {@code OR}). Xem DATABASE.md § alert_rule.
 */
public record AlertConditionGroup(String logic, List<AlertCondition> conditions) {
}
