package com.corp.iot.ingestion.external.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

// Câu SQL người dùng viết được đem đi bọc thành bảng con khi vá lịch sử — giữ nguyên LIMIT
// cuối câu thì mọi lô đều trả về đúng bấy nhiêu dòng và phần vá bị sai.
class ExternalSqlSupportTest {

    private ExternalSqlSupport support;

    @BeforeEach
    void setUp() {
        support = new ExternalSqlSupport();
    }

    @Test
    void goLimitCuoiCau() {
        String sql = "SELECT measured_at, temp\nFROM readings\nWHERE measured_at > :cursor\nORDER BY measured_at\nLIMIT 500";

        assertThat(support.toInnerSql(sql)).endsWith("ORDER BY measured_at");
    }

    @Test
    void goCaLimitKemOffsetVaDauChamPhay() {
        String sql = "SELECT t FROM r WHERE t > :cursor LIMIT 100 OFFSET 20;";

        assertThat(support.toInnerSql(sql)).isEqualTo("SELECT t FROM r WHERE t > :cursor");
    }

    @Test
    void giuLimitNamTrongBangConCuaNguoiDung() {
        String sql = "SELECT * FROM (SELECT t FROM r ORDER BY t LIMIT 5) x WHERE x.t > :cursor";

        assertThat(support.toInnerSql(sql)).isEqualTo(sql);
    }

    @Test
    void boCommentNhungGiuNguyenNoiDungChuoi() {
        String sql = "SELECT t, 'a -- b' AS note -- ghi chu\nFROM r WHERE t > :cursor";

        assertThat(support.toInnerSql(sql)).contains("'a -- b'");
        assertThat(support.toInnerSql(sql)).doesNotContain("ghi chu");
    }

    @Test
    void doiCursorThanhThamSoVaDemDungSoLan() {
        ExternalSqlSupport.PreparedSql prepared = support.toPreparedSql("SELECT t FROM r WHERE t > :cursor AND u > :cursor");

        assertThat(prepared.sql()).isEqualTo("SELECT t FROM r WHERE t > ? AND u > ?");
        assertThat(prepared.cursorParamCount()).isEqualTo(2);
    }

    @Test
    void jdbcUrlLuonCoReadOnlyMode() {
        assertThat(support.buildJdbcUrl(new com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig(
                "db.example.com", 5432, "sensors", null)))
                .contains("readOnlyMode=always");
    }
}
