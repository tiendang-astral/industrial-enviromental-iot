package com.corp.iot.backend.common.influx;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AggregationWindowTest {

    private static final int TARGET_POINTS = 500;
    /** Trần của TelemetryController — 7 ngày, khớp retention bucket `raw`. */
    private static final int MAX_RANGE_MINUTES = 10080;

    @Test
    void moiKhoangXemDeuChoRaKhongQuaTranDiem() {
        for (int rangeMinutes = 1; rangeMinutes <= MAX_RANGE_MINUTES; rangeMinutes++) {
            long points = (long) rangeMinutes * 60 / AggregationWindow.windowSeconds(rangeMinutes);
            assertThat(points).as("rangeMinutes=%d", rangeMinutes).isLessThanOrEqualTo(TARGET_POINTS);
        }
    }

    @Test
    void cuaSoTangDonDieuTheoKhoangXem() {
        int previous = 0;
        for (int rangeMinutes = 1; rangeMinutes <= MAX_RANGE_MINUTES; rangeMinutes++) {
            int current = AggregationWindow.windowSeconds(rangeMinutes);
            assertThat(current).as("rangeMinutes=%d", rangeMinutes).isGreaterThanOrEqualTo(previous);
            previous = current;
        }
    }

    @Test
    void khoangKhongHopLeVanTraVeBacHopLe() {
        assertThat(AggregationWindow.windowSeconds(1)).isEqualTo(1);
        assertThat(AggregationWindow.windowSeconds(0)).isEqualTo(1);
        assertThat(AggregationWindow.windowSeconds(-5)).isEqualTo(1);
    }

    @Test
    void cacKhoangHayDungRoiVaoBacTron() {
        assertThat(AggregationWindow.windowSeconds(60)).isEqualTo(10);      // 1 giờ  -> 10 giây
        assertThat(AggregationWindow.windowSeconds(360)).isEqualTo(60);     // 6 giờ  -> 1 phút
        assertThat(AggregationWindow.windowSeconds(1440)).isEqualTo(180);   // 24 giờ -> 3 phút
        assertThat(AggregationWindow.windowSeconds(10080)).isEqualTo(1800); // 7 ngày -> 30 phút
    }

    @Test
    void chuoiEveryLuonLaBacGiayHopLe() {
        assertThat(AggregationWindow.fluxEvery(1440)).isEqualTo("180s");
    }
}
