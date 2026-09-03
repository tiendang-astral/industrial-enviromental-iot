package com.corp.iot.backend.externalsourcejob.util;

import com.corp.iot.backend.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// :cursor là hợp đồng duy nhất giữa câu SQL người dùng viết và cơ chế đọc tăng dần — mất nó thì
// job đọc lại toàn bộ bảng mỗi lần chạy, nên phải chặn ngay lúc lưu chứ không đợi lúc chạy.
class SqlQueryValidatorTest {

    private final SqlQueryValidator validator = new SqlQueryValidator();

    @Test
    void acceptsSelectWithCursor() {
        validator.validate("SELECT measured_at, temp FROM readings WHERE measured_at > :cursor ORDER BY measured_at");
    }

    @Test
    void acceptsCteWithCursor() {
        validator.validate("WITH latest AS (SELECT * FROM readings WHERE ts > :cursor) SELECT * FROM latest");
    }

    @Test
    void rejectsQueryWithoutCursor() {
        assertThatThrownBy(() -> validator.validate("SELECT * FROM readings"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining(":cursor");
    }

    @Test
    void rejectsNonSelectStatement() {
        assertThatThrownBy(() -> validator.validate("DELETE FROM readings WHERE ts > :cursor"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("SELECT");
    }

    @Test
    void rejectsMultipleStatements() {
        assertThatThrownBy(() ->
                validator.validate("SELECT * FROM readings WHERE ts > :cursor; DROP TABLE readings"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("một câu lệnh");
    }

    @Test
    void allowsTrailingSemicolon() {
        validator.validate("SELECT * FROM readings WHERE ts > :cursor;");
    }

    @Test
    void ignoresCursorInsideStringLiteral() {
        assertThatThrownBy(() -> validator.validate("SELECT ':cursor' AS label FROM readings"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining(":cursor");
    }

    @Test
    void bindsEveryCursorOccurrence() {
        SqlQueryValidator.PreparedSql prepared = validator.toPreparedSql(
                "SELECT * FROM a WHERE ts > :cursor UNION ALL SELECT * FROM b WHERE ts > :cursor");

        assertThat(prepared.cursorParamCount()).isEqualTo(2);
        assertThat(prepared.sql()).doesNotContain(":cursor");
        assertThat(prepared.sql()).contains("ts > ?");
    }

    @Test
    void leavesCursorInsideStringLiteralUnbound() {
        SqlQueryValidator.PreparedSql prepared = validator.toPreparedSql(
                "SELECT ':cursor' AS label FROM a WHERE ts > :cursor");

        assertThat(prepared.cursorParamCount()).isEqualTo(1);
        assertThat(prepared.sql()).contains("':cursor'");
    }
}
