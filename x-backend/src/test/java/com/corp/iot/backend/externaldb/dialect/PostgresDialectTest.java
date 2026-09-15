package com.corp.iot.backend.externaldb.dialect;

import com.corp.iot.backend.externalsource.dto.ExternalSourceConnectionConfig;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

// Postgres có trước khi tách dialect — các test ở đây khoá đúng chuỗi SQL cũ để việc tách không đổi hành vi.
class PostgresDialectTest {

    private final PostgresDialect dialect = new PostgresDialect();

    @Test
    void jdbcUrlAlwaysForcesReadOnlyMode() {
        assertThat(dialect.jdbcUrl(new ExternalSourceConnectionConfig("db.example.com", 5432, "sensors", null)))
                .isEqualTo("jdbc:postgresql://db.example.com:5432/sensors?sslmode=disable&readOnlyMode=always");
    }

    @Test
    void jdbcUrlPassesSslModeThrough() {
        assertThat(dialect.jdbcUrl(new ExternalSourceConnectionConfig("db.example.com", 5432, "sensors", "require")))
                .contains("sslmode=require");
    }

    // Giữ lại LIMIT cuối câu thì phép đếm ước lượng luôn trả về đúng bấy nhiêu và người dùng thấy con số sai.
    @Test
    void innerSqlStripsTrailingLimit() {
        String sql = "SELECT measured_at, temp FROM readings WHERE measured_at > :cursor ORDER BY measured_at LIMIT 500";

        assertThat(dialect.toInnerSql(sql)).endsWith("ORDER BY measured_at");
    }

    @Test
    void innerSqlStripsLimitWithOffsetAndSemicolon() {
        assertThat(dialect.toInnerSql("SELECT t FROM r WHERE t > :cursor LIMIT 100 OFFSET 20;"))
                .isEqualTo("SELECT t FROM r WHERE t > :cursor");
    }

    @Test
    void innerSqlKeepsLimitInsideUserSubquery() {
        String sql = "SELECT * FROM (SELECT t FROM r ORDER BY t LIMIT 5) x WHERE x.t > :cursor";

        assertThat(dialect.toInnerSql(sql)).isEqualTo(sql);
    }

    @Test
    void innerSqlDropsCommentsButKeepsStringContent() {
        String sql = "SELECT t, 'a -- b' AS note -- ghi chu\nFROM r WHERE t > :cursor";

        assertThat(dialect.toInnerSql(sql)).contains("'a -- b'");
        assertThat(dialect.toInnerSql(sql)).doesNotContain("ghi chu");
    }

    @Test
    void wrapDerivedPutsInnerSqlInSubquery() {
        assertThat(dialect.wrapDerived("SELECT ts FROM r WHERE ts > ?", "*", "ORDER BY t.\"ts\" DESC"))
                .isEqualTo("SELECT * FROM (SELECT ts FROM r WHERE ts > ?) t ORDER BY t.\"ts\" DESC");
    }

    @Test
    void quotesIdentifierWithDoubleQuotes() {
        assertThat(dialect.quoteIdentifier("a\"b")).isEqualTo("\"a\"\"b\"");
    }

    @Test
    void statementTimeoutIsRecognised() {
        assertThat(dialect.isTimeout(new SQLException("canceling statement", "57014"))).isTrue();
        assertThat(dialect.isTimeout(new SQLException("syntax error", "42601"))).isFalse();
    }

    @Test
    void explainsWrongPassword() {
        assertThat(dialect.explain(new SQLException("auth failed", "28P01"), 10)).contains("mật khẩu");
    }

    // Đo thật với pgjdbc 42.7: bật mã hoá trên máy chủ ssl=off → 08004 "The server does not support SSL."
    @Test
    void explainsServerWithoutSsl() {
        assertThat(dialect.explain(new SQLException("The server does not support SSL.", "08004"), 10))
                .contains("chưa bật mã hoá");
    }
}
