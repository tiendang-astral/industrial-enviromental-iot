package com.corp.iot.processing.dto;

/**
 * Một điều kiện ngưỡng trong {@code alert_rule.conditions_json}. Nhiều điều kiện = quan hệ HOẶC
 * ({@code [{">",50},{"<",10}]} nghĩa là "ra ngoài khoảng 10–50").
 */
public record AlertCondition(String operator, Double threshold) {
}
