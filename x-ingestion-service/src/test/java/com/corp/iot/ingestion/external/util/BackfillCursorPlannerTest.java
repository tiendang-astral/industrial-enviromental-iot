package com.corp.iot.ingestion.external.util;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

// Luật lùi cursor quyết định dữ liệu có thủng hay không, và vòng lặp có dừng hay không.
class BackfillCursorPlannerTest {

    private static final Instant TARGET = Instant.parse("2026-01-01T00:00:00Z");

    @Test
    void windowStartLuiDungSoGioCauHinh() {
        Instant cursor = Instant.parse("2026-03-10T12:00:00Z");

        assertThat(BackfillCursorPlanner.windowStart(cursor, TARGET, 24))
                .isEqualTo(Instant.parse("2026-03-09T12:00:00Z"));
    }

    @Test
    void windowStartKhongVuotQuaDich() {
        Instant cursor = Instant.parse("2026-01-01T06:00:00Z");

        assertThat(BackfillCursorPlanner.windowStart(cursor, TARGET, 24)).isEqualTo(TARGET);
    }

    @Test
    void loChuaDayThiNhayHanQuaDauCuaSo() {
        Instant windowStart = Instant.parse("2026-03-09T12:00:00Z");

        assertThat(BackfillCursorPlanner.nextCursor(windowStart, 120, 1000, Instant.parse("2026-03-09T13:00:00Z")))
                .isEqualTo(windowStart);
    }

    @Test
    void loDayTranThiLuiToiDongCuNhatVuaDoc() {
        Instant windowStart = Instant.parse("2026-03-09T12:00:00Z");
        Instant oldest = Instant.parse("2026-03-10T02:00:00Z");

        assertThat(BackfillCursorPlanner.nextCursor(windowStart, 1000, 1000, oldest)).isEqualTo(oldest);
    }

    // Nếu dòng cũ nhất rơi đúng đầu cửa sổ mà vẫn trả về nó thì lô sau đọc lại y hệt — vòng lặp
    // không bao giờ dừng. Phải nhảy qua đầu cửa sổ.
    @Test
    void loDayTranNhungDongCuNhatODauCuaSoThiVanNhayQua() {
        Instant windowStart = Instant.parse("2026-03-09T12:00:00Z");

        assertThat(BackfillCursorPlanner.nextCursor(windowStart, 1000, 1000, windowStart)).isEqualTo(windowStart);
    }

    @Test
    void chamDichKhiCursorKhongConLonHonDich() {
        assertThat(BackfillCursorPlanner.reachedTarget(TARGET, TARGET)).isTrue();
        assertThat(BackfillCursorPlanner.reachedTarget(TARGET.minusSeconds(1), TARGET)).isTrue();
        assertThat(BackfillCursorPlanner.reachedTarget(TARGET.plusSeconds(1), TARGET)).isFalse();
    }
}
