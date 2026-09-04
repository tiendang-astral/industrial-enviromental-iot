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

    // toInnerSql phục vụ 2 việc: đếm ước lượng và bọc bảng con khi vá lịch sử. Giữ lại LIMIT
    // cuối câu thì phép đếm luôn trả về đúng bấy nhiêu và người dùng thấy con số sai.
    @Test
    void innerSqlStripsTrailingLimit() {
        String sql = "SELECT measured_at, temp FROM readings WHERE measured_at > :cursor ORDER BY measured_at LIMIT 500";

        assertThat(validator.toInnerSql(sql)).endsWith("ORDER BY measured_at");
    }

    @Test
    void innerSqlStripsLimitWithOffsetAndSemicolon() {
        assertThat(validator.toInnerSql("SELECT t FROM r WHERE t > :cursor LIMIT 100 OFFSET 20;"))
                .isEqualTo("SELECT t FROM r WHERE t > :cursor");
    }

    @Test
    void innerSqlKeepsLimitInsideUserSubquery() {
        String sql = "SELECT * FROM (SELECT t FROM r ORDER BY t LIMIT 5) x WHERE x.t > :cursor";

        assertThat(validator.toInnerSql(sql)).isEqualTo(sql);
    }

    @Test
    void innerSqlDropsCommentsButKeepsStringContent() {
        String sql = "SELECT t, 'a -- b' AS note -- ghi chu\nFROM r WHERE t > :cursor";

        assertThat(validator.toInnerSql(sql)).contains("'a -- b'");
        assertThat(validator.toInnerSql(sql)).doesNotContain("ghi chu");
    }
}
