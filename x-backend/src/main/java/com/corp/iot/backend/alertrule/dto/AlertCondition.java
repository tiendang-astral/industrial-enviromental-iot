package com.corp.iot.backend.alertrule.dto;

/**
 * Một điều kiện ngưỡng trong {@code alert_rule.conditions_json}.
 * Nhiều điều kiện trong cùng một rule là quan hệ HOẶC: {@code [{">",50},{"<",10}]} nghĩa là
 * "ra ngoài khoảng 10–50". VÀ trên cùng một metric vô nghĩa (>30 AND >40 chỉ là >40).
 */
public record AlertCondition(String operator, Double threshold) {
}
