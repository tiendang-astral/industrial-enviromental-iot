package com.corp.iot.processing.alert;

import com.corp.iot.processing.dto.AlertCondition;
import com.corp.iot.processing.dto.AlertConditionGroup;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AlertConditionEvaluatorTest {

    private final AlertConditionEvaluator evaluator = new AlertConditionEvaluator();

    private static AlertConditionGroup or(AlertCondition... conditions) {
        return new AlertConditionGroup("OR", List.of(conditions));
    }

    private static AlertConditionGroup and(AlertCondition... conditions) {
        return new AlertConditionGroup("AND", List.of(conditions));
    }

    @Test
    void bonToanTuSoSanhDungBien() {
        assertThat(evaluator.isViolated(or(new AlertCondition(">", 30.0)), 30.0)).isFalse();
        assertThat(evaluator.isViolated(or(new AlertCondition(">=", 30.0)), 30.0)).isTrue();
        assertThat(evaluator.isViolated(or(new AlertCondition("<", 30.0)), 30.0)).isFalse();
        assertThat(evaluator.isViolated(or(new AlertCondition("<=", 30.0)), 30.0)).isTrue();
    }

    @Test
    void nhieuDieuKienLaQuanHeHoac() {
        // "ra ngoài khoảng 10–50"
        AlertConditionGroup raNgoaiKhoang = or(new AlertCondition(">", 50.0), new AlertCondition("<", 10.0));
        assertThat(evaluator.isViolated(raNgoaiKhoang, 30.0)).isFalse();
        assertThat(evaluator.isViolated(raNgoaiKhoang, 51.0)).isTrue();
        assertThat(evaluator.isViolated(raNgoaiKhoang, 9.0)).isTrue();
    }

    @Test
    void giaTriNullHoacDieuKienRongThiKhongViPham() {
        assertThat(evaluator.isViolated(or(new AlertCondition(">", 30.0)), null)).isFalse();
        assertThat(evaluator.isViolated(or(), 999.0)).isFalse();
        assertThat(evaluator.isViolated(null, 999.0)).isFalse();
    }

    @Test
    void andPhuPresetTrongKhoang() {
        // "trong khoảng 20–30" — ca duy nhất OR không biểu diễn được, lý do engine phải học logic.
        AlertConditionGroup trongKhoang = and(new AlertCondition(">=", 20.0), new AlertCondition("<=", 30.0));
        assertThat(evaluator.isViolated(trongKhoang, 25.0)).isTrue();
        assertThat(evaluator.isViolated(trongKhoang, 20.0)).isTrue();
        assertThat(evaluator.isViolated(trongKhoang, 31.0)).isFalse();
        assertThat(evaluator.isViolated(trongKhoang, 19.0)).isFalse();
    }

    @Test
    void thieuLogicThiHieuLaOr() {
        // Dữ liệu trước V16 là mảng phẳng, ngữ nghĩa lúc đó là OR.
        AlertConditionGroup khongLogic =
                new AlertConditionGroup(null, List.of(new AlertCondition(">", 50.0), new AlertCondition("<", 10.0)));
        assertThat(evaluator.isViolated(khongLogic, 51.0)).isTrue();
        assertThat(evaluator.isViolated(khongLogic, 30.0)).isFalse();
    }

    @Test
    void toanTuLaHoacNguongNullThiBoQuaDieuKienDo() {
        assertThat(evaluator.isViolated(or(new AlertCondition("!=", 30.0)), 99.0)).isFalse();
        assertThat(evaluator.isViolated(or(new AlertCondition(">", null)), 99.0)).isFalse();
        // Điều kiện hỏng không được che mất điều kiện hợp lệ đứng cạnh.
        assertThat(evaluator.isViolated(
                or(new AlertCondition("!=", 30.0), new AlertCondition(">", 50.0)), 99.0)).isTrue();
    }
}
