package com.corp.iot.ingestion.external.dialect;

import com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

// Khoá đúng chuỗi SQL/kết nối trước khi tách dialect — Postgres phải chạy y như cũ.
class PostgresDialectTest {

    private final PostgresDialect dialect = new PostgresDialect();

    @Test
    void jdbcUrlLuonCoReadOnlyMode() {
        assertThat(dialect.jdbcUrl(new ExternalSourceConnectionConfig("db.example.com", 5432, "sensors", null)))
                .isEqualTo("jdbc:postgresql://db.example.com:5432/sensors?sslmode=disable&readOnlyMode=always");
    }

    // Giữ nguyên LIMIT cuối câu thì mọi lô vá lịch sử đều trả về đúng bấy nhiêu dòng và phần vá bị sai.
    @Test
    void goLimitCuoiCau() {
        String sql = "SELECT measured_at, temp\nFROM readings\nWHERE measured_at > :cursor\nORDER BY measured_at\nLIMIT 500";

        assertThat(dialect.toInnerSql(sql)).endsWith("ORDER BY measured_at");
    }

    @Test
    void goCaLimitKemOffsetVaDauChamPhay() {
        assertThat(dialect.toInnerSql("SELECT t FROM r WHERE t > :cursor LIMIT 100 OFFSET 20;"))
                .isEqualTo("SELECT t FROM r WHERE t > :cursor");
    }

    @Test
    void giuLimitNamTrongBangConCuaNguoiDung() {
        String sql = "SELECT * FROM (SELECT t FROM r ORDER BY t LIMIT 5) x WHERE x.t > :cursor";

        assertThat(dialect.toInnerSql(sql)).isEqualTo(sql);
    }

    @Test
    void boCommentNhungGiuNguyenNoiDungChuoi() {
        String sql = "SELECT t, 'a -- b' AS note -- ghi chu\nFROM r WHERE t > :cursor";

        assertThat(dialect.toInnerSql(sql)).contains("'a -- b'");
        assertThat(dialect.toInnerSql(sql)).doesNotContain("ghi chu");
    }

    @Test
    void cauDocLoVaLichSuGiongHetBanCu() {
        String column = dialect.quoteIdentifier("ts");

        assertThat(dialect.wrapDerived("SELECT ts FROM r WHERE ts > ?", "*",
                "WHERE t." + column + " < ? ORDER BY t." + column + " DESC"))
                .isEqualTo("SELECT * FROM (SELECT ts FROM r WHERE ts > ?) t WHERE t.\"ts\" < ? ORDER BY t.\"ts\" DESC");
    }
}
