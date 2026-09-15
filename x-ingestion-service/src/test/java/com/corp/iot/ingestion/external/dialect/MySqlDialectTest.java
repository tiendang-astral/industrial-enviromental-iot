package com.corp.iot.ingestion.external.dialect;

import com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class MySqlDialectTest {

    private final MySqlDialect dialect = new MySqlDialect();

    @Test
    void tatMaHoaThiSslModeDisable() {
        assertThat(dialect.jdbcUrl(new ExternalSourceConnectionConfig("db.example.com", 3306, "sensors", null)))
                .startsWith("jdbc:mariadb://db.example.com:3306/sensors?")
                .contains("sslMode=disable")
                .contains("allowPublicKeyRetrieval=true");
    }

    @Test
    void batMaHoaThiTinChungChiMayChu() {
        assertThat(dialect.jdbcUrl(new ExternalSourceConnectionConfig("db.example.com", 3306, "sensors", "require")))
                .contains("sslMode=trust");
    }

    // Giữ LIMIT cuối câu thì mọi lô vá lịch sử đều bị cắt cụt đúng bấy nhiêu dòng.
    @Test
    void goLimitCuoiCauCaDangDauPhay() {
        assertThat(dialect.toInnerSql("SELECT ts FROM r WHERE ts > :cursor ORDER BY ts LIMIT 20, 100;"))
                .isEqualTo("SELECT ts FROM r WHERE ts > :cursor ORDER BY ts");
    }

    @Test
    void cauDocLoVaLichSuDungBacktick() {
        String column = dialect.quoteIdentifier("ts");

        assertThat(dialect.wrapDerived("SELECT ts FROM r WHERE ts > ?", "*",
                "WHERE t." + column + " < ? ORDER BY t." + column + " DESC"))
                .isEqualTo("SELECT * FROM (SELECT ts FROM r WHERE ts > ?) t WHERE t.`ts` < ? ORDER BY t.`ts` DESC");
    }

    @Test
    void doiLocalDateTimeTheoMuiGioJvm() {
        LocalDateTime value = LocalDateTime.of(2026, 9, 15, 9, 0);

        assertThat(dialect.toInstant(value)).isEqualTo(value.atZone(ZoneId.systemDefault()).toInstant());
    }
}
