package com.corp.iot.processing.alert;

import com.corp.iot.processing.dto.AlertCondition;
import com.corp.iot.processing.dto.AlertConditionGroup;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Đánh giá nhóm điều kiện của một rule. Một tầng, một phép nối:
 * {@code OR} phủ "lớn hơn"/"nhỏ hơn"/"ra ngoài khoảng", {@code AND} phủ "trong khoảng".
 *
 * Thiếu {@code logic} (dữ liệu cũ dạng mảng phẳng, trước `V16`) thì hiểu là {@code OR} — đúng
 * ngữ nghĩa lúc đó.
 */
@Slf4j
@Component
public class AlertConditionEvaluator {

    public boolean isViolated(AlertConditionGroup group, Double value) {
        if (value == null || group == null || group.conditions() == null || group.conditions().isEmpty()) {
            return false;
        }
        List<AlertCondition> usable = group.conditions().stream()
                .filter(condition -> condition != null && condition.threshold() != null)
                .toList();
        if (usable.isEmpty()) {
            return false;
        }
        return "AND".equalsIgnoreCase(group.logic())
                ? usable.stream().allMatch(condition -> violates(condition, value))
                : usable.stream().anyMatch(condition -> violates(condition, value));
    }

    private boolean violates(AlertCondition condition, double value) {
        double threshold = condition.threshold();
        return switch (condition.operator()) {
            case ">" -> value > threshold;
            case ">=" -> value >= threshold;
            case "<" -> value < threshold;
            case "<=" -> value <= threshold;
            default -> {
                // x-backend đã chặn toán tử lạ lúc lưu; tới đây là dữ liệu cũ hoặc sửa tay trong DB.
                // Coi như không vi phạm ở cả AND lẫn OR: cấu hình hỏng thì im lặng còn hơn spam.
                log.warn("Toán tử không hỗ trợ: {}", condition.operator());
                yield false;
            }
        };
    }
}
