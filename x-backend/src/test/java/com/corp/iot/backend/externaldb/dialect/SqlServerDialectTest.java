package com.corp.iot.backend.externaldb.dialect;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.externalsource.dto.ExternalSourceConnectionConfig;
import microsoft.sql.DateTimeOffset;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;

class SqlServerDialectTest {

    private final SqlServerDialect dialect = new SqlServerDialect();

    private static ExternalSourceConnectionConfig config(String sslMode) {
        return new ExternalSourceConnectionConfig("db.example.com", 1433, "sensors", sslMode);
    }

    @Test
    void jdbcUrlWithoutSslModeDisablesEncryption() {
        assertThat(dialect.jdbcUrl(config(null)))
                .startsWith("jdbc:sqlserver://db.example.com:1433;databaseName={sensors}")
                .contains(";encrypt=false");
    }

    // Bật mã hoá = luôn mã hoá, tin chứng chỉ tự ký — máy chủ ở nhà máy gần như luôn dùng chứng chỉ tự sinh.
    @Test
    void jdbcUrlEncryptionOnTrustsSelfSignedCertificate() {
        assertThat(dialect.jdbcUrl(config("require")))
                .contains(";encrypt=true")
                .contains(";trustServerCertificate=true");
    }

    @Test
    void jdbcUrlLegacyPreferBehavesLikeEncryptionOn() {
        assertThat(dialect.jdbcUrl(config("prefer"))).isEqualTo(dialect.jdbcUrl(config("require")));
    }

    // T-SQL không cho ORDER BY trong bảng con nếu thiếu TOP/OFFSET, còn TOP thì làm phép đếm và từng lô vá sai.
    @Test
    void innerSqlStripsTopAndTrailingOrderBy() {
        assertThat(dialect.toInnerSql("SELECT TOP (500) ts, temp FROM r WHERE ts > :cursor ORDER BY ts"))
                .isEqualTo("SELECT ts, temp FROM r WHERE ts > :cursor");
    }

    @Test
    void innerSqlStripsTopWithoutParenthesesAfterDistinct() {
        assertThat(dialect.toInnerSql("SELECT DISTINCT TOP 10 ts FROM r WHERE ts > :cursor"))
                .isEqualTo("SELECT DISTINCT ts FROM r WHERE ts > :cursor");
    }

    @Test
    void innerSqlStripsOffsetFetchAndSemicolon() {
        assertThat(dialect.toInnerSql(
                "SELECT ts FROM r WHERE ts > :cursor ORDER BY ts OFFSET 0 ROWS FETCH NEXT 500 ROWS ONLY;"))
                .isEqualTo("SELECT ts FROM r WHERE ts > :cursor");
    }

    @Test
    void innerSqlKeepsOrderByInsideParentheses() {
        String sql = "SELECT ts, ROW_NUMBER() OVER (ORDER BY ts) AS rn FROM (SELECT TOP 5 ts FROM r ORDER BY ts) x WHERE ts > :cursor";

        assertThat(dialect.toInnerSql(sql)).isEqualTo(sql);
    }

    @Test
    void innerSqlIgnoresOrderByInsideStringLiteral() {
        String sql = "SELECT ts, 'ORDER BY ts' AS note FROM r WHERE ts > :cursor";

        assertThat(dialect.toInnerSql(sql)).isEqualTo(sql);
    }

    @Test
    void innerSqlStripsTopOfMainSelectOnlyWhenCtePresent() {
        assertThat(dialect.toInnerSql(
                "WITH a AS (SELECT TOP 5 ts FROM r ORDER BY ts) SELECT TOP (100) ts FROM a WHERE ts > :cursor ORDER BY ts"))
                .isEqualTo("WITH a AS (SELECT TOP 5 ts FROM r ORDER BY ts) SELECT ts FROM a WHERE ts > :cursor");
    }

    @Test
    void wrapDerivedPutsInnerSqlInSubquery() {
        assertThat(dialect.wrapDerived("SELECT ts FROM r WHERE ts > ?", "count(*)", "WHERE t.[ts] < ?"))
                .isEqualTo("SELECT count(*) FROM (SELECT ts FROM r WHERE ts > ?) t WHERE t.[ts] < ?");
    }

    // T-SQL không cho WITH nằm trong bảng con — phải kéo nó ra trước câu ngoài.
    @Test
    void wrapDerivedHoistsCteBeforeOuterSelect() {
        String inner = "WITH a AS (SELECT ts FROM r WHERE ts > ?), b (ts) AS (SELECT ts FROM a) SELECT ts FROM b";

        assertThat(dialect.wrapDerived(inner, "*", "ORDER BY t.[ts] DESC"))
                .isEqualTo("WITH a AS (SELECT ts FROM r WHERE ts > ?), b (ts) AS (SELECT ts FROM a) "
                        + "SELECT * FROM (SELECT ts FROM b) t ORDER BY t.[ts] DESC");
    }

    @Test
    void wrapDerivedIgnoresParenthesisInsideStringOfCte() {
        String inner = "WITH a AS (SELECT ')' AS p, ts FROM r) SELECT ts FROM a";

        assertThat(dialect.wrapDerived(inner, "*", ""))
                .isEqualTo("WITH a AS (SELECT ')' AS p, ts FROM r) SELECT * FROM (SELECT ts FROM a) t");
    }

    @Test
    void wrapDerivedRejectsMalformedCte() {
        assertThatThrownBy(() -> dialect.wrapDerived("WITH a SELECT ts FROM r", "*", ""))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_QUERY");
    }

    @Test
    void quotesIdentifierWithBrackets() {
        assertThat(dialect.quoteIdentifier("a]b")).isEqualTo("[a]]b]");
    }

    @Test
    void queryTimeoutIsRecognised() {
        assertThat(dialect.isTimeout(new SQLTimeoutException("The query has timed out."))).isTrue();
        assertThat(dialect.isTimeout(new SQLException("The query has timed out.", "HY008"))).isTrue();
        assertThat(dialect.isTimeout(new SQLException("Invalid column name", "S0001", 207))).isFalse();
    }

    @Test
    void explainsLoginFailure() {
        assertThat(dialect.explain(new SQLException("Login failed", "S0001", 18456), 10)).contains("mật khẩu");
    }

    // Driver SQL Server không có chế độ chỉ-đọc ở phía máy chủ — rollback lúc đóng là lớp chặn ghi còn lại.
    @Test
    void closingConnectionRollsBackFirst() throws SQLException {
        Connection raw = mock(Connection.class);

        SqlServerDialect.rollbackOnClose(raw).close();

        InOrder order = inOrder(raw);
        order.verify(raw).rollback();
        order.verify(raw).close();
    }

    @Test
    void convertsDateTimeOffsetToInstant() {
        Instant instant = Instant.parse("2026-09-15T02:00:00Z");

        assertThat(dialect.toInstant(DateTimeOffset.valueOf(Timestamp.from(instant), 420))).isEqualTo(instant);
    }

    @Test
    void recognisesSqlServerColumnTypes() {
        assertThat(dialect.isTimestampType("datetime2")).isTrue();
        assertThat(dialect.isTimestampType("datetimeoffset")).isTrue();
        assertThat(dialect.isNumericType("money")).isTrue();
        assertThat(dialect.isNumericType("varchar")).isFalse();
    }
}
