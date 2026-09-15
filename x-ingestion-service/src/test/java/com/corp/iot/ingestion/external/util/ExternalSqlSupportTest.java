package com.corp.iot.ingestion.external.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

// Phần không phụ thuộc loại database. Chuỗi kết nối và cách bọc bảng con nằm ở dialect/*Test.
class ExternalSqlSupportTest {

    private ExternalSqlSupport support;

    @BeforeEach
    void setUp() {
        support = new ExternalSqlSupport();
    }

    @Test
    void doiCursorThanhThamSoVaDemDungSoLan() {
        ExternalSqlSupport.PreparedSql prepared = support.toPreparedSql("SELECT t FROM r WHERE t > :cursor AND u > :cursor");

        assertThat(prepared.sql()).isEqualTo("SELECT t FROM r WHERE t > ? AND u > ?");
        assertThat(prepared.cursorParamCount()).isEqualTo(2);
    }

    @Test
    void boQuaCursorNamTrongChuoi() {
        ExternalSqlSupport.PreparedSql prepared = support.toPreparedSql("SELECT ':cursor' AS label FROM r WHERE t > :cursor");

        assertThat(prepared.cursorParamCount()).isEqualTo(1);
        assertThat(prepared.sql()).contains("':cursor'");
    }
}
