package com.corp.iot.ingestion.external.dialect;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExternalDbDialectsTest {

    private final ExternalDbDialects dialects = new ExternalDbDialects(
            List.of(new PostgresDialect(), new SqlServerDialect(), new MySqlDialect()));

    @Test
    void chonDungDialectTheoLoaiKetNoi() {
        assertThat(dialects.of("SQLSERVER")).isInstanceOf(SqlServerDialect.class);
        assertThat(dialects.of("MYSQL")).isInstanceOf(MySqlDialect.class);
    }

    // Loại chưa có dialect thì job phải FAILED rõ lý do, không được đoán.
    @Test
    void loaiChuaCoDialectThiBaoLoi() {
        assertThatThrownBy(() -> dialects.of("ORACLE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ORACLE");
    }
}
