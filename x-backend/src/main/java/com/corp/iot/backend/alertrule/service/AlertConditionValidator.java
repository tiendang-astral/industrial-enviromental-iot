package com.corp.iot.backend.alertrule.service;

import com.corp.iot.backend.alertrule.dto.AlertCondition;
import com.corp.iot.backend.alertrule.dto.AlertConditionGroup;
import com.corp.iot.backend.common.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Set;

/** Dùng chung cho rule đơn lẻ lẫn nhóm — luật hợp lệ phải giống nhau ở cả hai đường ghi. */
@Component
public class AlertConditionValidator {

    private static final Set<String> OPERATORS = Set.of(">", ">=", "<", "<=");

    public void validate(AlertConditionGroup group) {
        if (group == null || group.conditions() == null || group.conditions().isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CONDITION", "Cần ít nhất 1 điều kiện");
        }
        if (!AlertConditionGroup.AND.equals(group.logic()) && !AlertConditionGroup.OR.equals(group.logic())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CONDITION",
                    "Phép nối điều kiện phải là AND hoặc OR");
        }
        for (AlertCondition condition : group.conditions()) {
            if (condition == null || condition.threshold() == null || !OPERATORS.contains(condition.operator())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CONDITION",
                        "Điều kiện phải có ngưỡng và toán tử thuộc >, >=, <, <=");
            }
        }
    }
}
