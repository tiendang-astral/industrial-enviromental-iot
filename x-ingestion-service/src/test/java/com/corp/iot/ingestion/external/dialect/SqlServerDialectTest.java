package com.corp.iot.ingestion.external.dialect;

import com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig;
import microsoft.sql.DateTimeOffset;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;

class SqlServerDialectTest {

    private final SqlServerDialect dialect = new SqlServerDialect();

    @Test
    void jdbcUrlKhongSslThiTatMaHoa() {
        assertThat(dialect.jdbcUrl(new ExternalSourceConnectionConfig("db.example.com", 1433, "sensors", null)))
                .startsWith("jdbc:sqlserver://db.example.com:1433;databaseName={sensors}")
                .contains(";encrypt=false");
    }

    @Test
    void batMaHoaThiLuonMaHoaVaTinChungChiTuKy() {
        assertThat(dialect.jdbcUrl(new ExternalSourceConnectionConfig("db.example.com", 1433, "sensors", "require")))
                .contains(";encrypt=true")
                .contains(";trustServerCertificate=true");
    }

    // T-SQL không cho ORDER BY trong bảng con nếu thiếu TOP/OFFSET, còn TOP thì làm từng lô vá bị cắt cụt.
    @Test
    void goTopVaOrderByCuaCauChinh() {
        assertThat(dialect.toInnerSql("SELECT TOP (500) ts, temp FROM r WHERE ts > :cursor ORDER BY ts;"))
                .isEqualTo("SELECT ts, temp FROM r WHERE ts > :cursor");
    }

    @Test
    void giuOrderByNamTrongNgoac() {
        String sql = "SELECT ts, ROW_NUMBER() OVER (ORDER BY ts) AS rn FROM r WHERE ts > :cursor";

        assertThat(dialect.toInnerSql(sql)).isEqualTo(sql);
    }

    @Test
    void keoCteRaTruocCauNgoai() {
        assertThat(dialect.wrapDerived("WITH a AS (SELECT ts FROM r WHERE ts > ?) SELECT ts FROM a", "*",
                "WHERE t.[ts] < ? ORDER BY t.[ts] DESC"))
                .isEqualTo("WITH a AS (SELECT ts FROM r WHERE ts > ?) SELECT * FROM (SELECT ts FROM a) t "
                        + "WHERE t.[ts] < ? ORDER BY t.[ts] DESC");
    }

    @Test
    void cteSaiCuPhapThiBaoLoi() {
        assertThatThrownBy(() -> dialect.wrapDerived("WITH a SELECT ts FROM r", "*", ""))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void quoteBangNgoacVuong() {
        assertThat(dialect.quoteIdentifier("a]b")).isEqualTo("[a]]b]");
    }

    // Không có phiên READ ONLY phía máy chủ — rollback lúc đóng là lớp chặn ghi còn lại.
    @Test
    void dongKetNoiLuonRollbackTruoc() throws SQLException {
        Connection raw = mock(Connection.class);

        SqlServerDialect.rollbackOnClose(raw).close();

        InOrder order = inOrder(raw);
        order.verify(raw).rollback();
        order.verify(raw).close();
    }

    @Test
    void doiDateTimeOffsetThanhInstant() {
        Instant instant = Instant.parse("2026-09-15T02:00:00Z");

        assertThat(dialect.toInstant(DateTimeOffset.valueOf(Timestamp.from(instant), 420))).isEqualTo(instant);
    }
}
