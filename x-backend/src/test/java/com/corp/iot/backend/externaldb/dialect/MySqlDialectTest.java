package com.corp.iot.backend.externaldb.dialect;

import com.corp.iot.backend.externalsource.dto.ExternalSourceConnectionConfig;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class MySqlDialectTest {

    private final MySqlDialect dialect = new MySqlDialect();

    private static ExternalSourceConnectionConfig config(String sslMode) {
        return new ExternalSourceConnectionConfig("db.example.com", 3306, "sensors", sslMode);
    }

    @Test
    void jdbcUrlEncryptionOffDisablesSsl() {
        assertThat(dialect.jdbcUrl(config(null)))
                .startsWith("jdbc:mariadb://db.example.com:3306/sensors?")
                .contains("sslMode=disable");
    }

    // Bật mã hoá = luôn mã hoá, tin chứng chỉ máy chủ — MySQL/MariaDB tự sinh chứng chỉ tự ký khi cài.
    @Test
    void jdbcUrlEncryptionOnTrustsServerCertificate() {
        assertThat(dialect.jdbcUrl(config("require"))).contains("sslMode=trust");
        assertThat(dialect.jdbcUrl(config("prefer"))).contains("sslMode=trust");
    }

    // MySQL 8 đăng nhập bằng caching_sha2_password — thiếu cờ này thì kết nối không mã hoá bị từ chối.
    @Test
    void jdbcUrlAllowsPublicKeyRetrieval() {
        assertThat(dialect.jdbcUrl(config(null))).contains("allowPublicKeyRetrieval=true");
    }

    @Test
    void innerSqlStripsTrailingLimit() {
        assertThat(dialect.toInnerSql("SELECT ts, temp FROM r WHERE ts > :cursor ORDER BY ts LIMIT 500"))
                .isEqualTo("SELECT ts, temp FROM r WHERE ts > :cursor ORDER BY ts");
    }

    @Test
    void innerSqlStripsLimitWithOffset() {
        assertThat(dialect.toInnerSql("SELECT ts FROM r WHERE ts > :cursor LIMIT 100 OFFSET 20;"))
                .isEqualTo("SELECT ts FROM r WHERE ts > :cursor");
    }

    @Test
    void innerSqlStripsCommaStyleLimit() {
        assertThat(dialect.toInnerSql("SELECT ts FROM r WHERE ts > :cursor LIMIT 20, 100"))
                .isEqualTo("SELECT ts FROM r WHERE ts > :cursor");
    }

    @Test
    void innerSqlKeepsLimitInsideUserSubquery() {
        String sql = "SELECT * FROM (SELECT ts FROM r ORDER BY ts LIMIT 5) x WHERE x.ts > :cursor";

        assertThat(dialect.toInnerSql(sql)).isEqualTo(sql);
    }

    @Test
    void wrapDerivedPutsInnerSqlInSubquery() {
        assertThat(dialect.wrapDerived("SELECT ts FROM r WHERE ts > ?", "count(*)", "WHERE t.`ts` < ?"))
                .isEqualTo("SELECT count(*) FROM (SELECT ts FROM r WHERE ts > ?) t WHERE t.`ts` < ?");
    }

    @Test
    void quotesIdentifierWithBackticks() {
        assertThat(dialect.quoteIdentifier("a`b")).isEqualTo("`a``b`");
    }

    @Test
    void queryTimeoutIsRecognised() {
        assertThat(dialect.isTimeout(new SQLTimeoutException("Query execution was interrupted"))).isTrue();
        assertThat(dialect.isTimeout(new SQLException("maximum statement execution time exceeded", "HY000", 3024))).isTrue();
        assertThat(dialect.isTimeout(new SQLException("You have an error in your SQL syntax", "42000", 1064))).isFalse();
    }

    @Test
    void explainsWrongPassword() {
        assertThat(dialect.explain(new SQLException("Access denied for user", "28000", 1045), 10)).contains("mật khẩu");
    }

    @Test
    void explainsUnknownDatabase() {
        assertThat(dialect.explain(new SQLException("Unknown database 'x'", "42000", 1049), 10)).contains("không tồn tại");
    }

    @Test
    void explainsServerWithoutSsl() {
        assertThat(dialect.explain(new SQLException("Trying to connect with ssl, but ssl not enabled in the server", "08000"), 10))
                .contains("chưa bật mã hoá");
    }

    // Driver có thể trả DATETIME dạng LocalDateTime — không hiểu kiểu này thì mọi dòng bị bỏ qua vì "thiếu thời gian".
    @Test
    void convertsLocalDateTimeUsingJvmZone() {
        LocalDateTime value = LocalDateTime.of(2026, 9, 15, 9, 0);

        assertThat(dialect.toInstant(value)).isEqualTo(value.atZone(ZoneId.systemDefault()).toInstant());
    }

    @Test
    void recognisesMySqlColumnTypes() {
        assertThat(dialect.isTimestampType("datetime")).isTrue();
        assertThat(dialect.isTimestampType("timestamp")).isTrue();
        assertThat(dialect.isNumericType("double")).isTrue();
        assertThat(dialect.isNumericType("mediumint")).isTrue();
        assertThat(dialect.isNumericType("varchar")).isFalse();
    }
}
