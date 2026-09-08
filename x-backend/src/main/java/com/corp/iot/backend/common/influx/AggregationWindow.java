package com.corp.iot.backend.common.influx;

/**
 * Cỡ cửa sổ gộp mẫu cho câu đọc lịch sử.
 *
 * Không có nó thì đọc 7 ngày của MỘT kênh ở chu kỳ 5 giây đã là ~121.000 điểm, nhân với số kênh
 * của gateway thành hàng triệu điểm trong một response JSON.
 */
public final class AggregationWindow {

    /** Đủ dày cho biểu đồ rộng, đủ thưa để response không phình theo khoảng xem. */
    private static final int TARGET_POINTS = 500;

    /**
     * Thang bậc cố định thay vì chia đúng khoảng cho số điểm: mốc cửa sổ nhờ vậy rơi vào
     * giây/phút/giờ tròn, các kênh khớp mốc thời gian với nhau và đổi khoảng xem không làm
     * đường biểu đồ nhảy lệch.
     */
    private static final int[] LADDER_SECONDS = {
            1, 5, 10, 15, 30,
            60, 120, 180, 300, 600, 900, 1200, 1800,
            3600, 7200, 10800, 21600, 43200, 86400
    };

    private AggregationWindow() {
    }

    public static int windowSeconds(int rangeMinutes) {
        long totalSeconds = (long) Math.max(rangeMinutes, 1) * 60;
        for (int step : LADDER_SECONDS) {
            if (totalSeconds / step <= TARGET_POINTS) {
                return step;
            }
        }
        return LADDER_SECONDS[LADDER_SECONDS.length - 1];
    }

    /** Chuỗi `every` của Flux — chỉ sinh từ thang bậc trên, không bao giờ từ input người dùng. */
    public static String fluxEvery(int rangeMinutes) {
        return windowSeconds(rangeMinutes) + "s";
    }
}
