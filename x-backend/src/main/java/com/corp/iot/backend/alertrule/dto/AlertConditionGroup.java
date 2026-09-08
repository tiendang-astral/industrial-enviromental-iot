package com.corp.iot.backend.alertrule.dto;

import java.util.List;

/**
 * Nội dung {@code alert_rule.conditions_json}: một nhóm điều kiện với một phép nối duy nhất.
 *
 * Chỉ một tầng, cố ý. Bốn kiểu người dùng thật sự cần trên một chỉ số đơn — lớn hơn, nhỏ hơn,
 * ra ngoài khoảng ({@code OR}), trong khoảng ({@code AND}) — đều nằm gọn ở một tầng; builder lồng
 * nhau chỉ thêm chỗ để bấm sai.
 */
public record AlertConditionGroup(String logic, List<AlertCondition> conditions) {

    public static final String AND = "AND";
    public static final String OR = "OR";
}
