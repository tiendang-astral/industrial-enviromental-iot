package com.corp.iot.ingestion.external.util;

import java.time.Duration;
import java.time.Instant;

// Luật lùi cursor khi vá lịch sử. Tách khỏi ExternalBackfillService để test được mà không cần
// database ngoài — đây là chỗ dễ sai nhất: lùi hụt thì thủng dữ liệu, lùi thừa thì lặp vô hạn.
public final class BackfillCursorPlanner {

    private BackfillCursorPlanner() {
    }

    /** Cận dưới của lô hiện tại — chặn cả hai đầu để Postgres đẩy điều kiện xuống bảng con. */
    public static Instant windowStart(Instant cursor, Instant targetFrom, int windowHours) {
        Instant candidate = cursor.minus(Duration.ofHours(windowHours));
        return candidate.isBefore(targetFrom) ? targetFrom : candidate;
    }

    /**
     * Lô đầy trần nghĩa là cửa sổ còn dòng chưa đọc — lùi tới dòng cũ nhất vừa đọc rồi vào lại
     * chính cửa sổ đó. Chưa đầy nghĩa là cửa sổ đã cạn, nhảy hẳn qua đầu cửa sổ.
     */
    public static Instant nextCursor(Instant windowStart, long rowsRead, int batchRows, Instant oldestRead) {
        if (rowsRead >= batchRows && oldestRead != null && oldestRead.isAfter(windowStart)) {
            return oldestRead;
        }
        return windowStart;
    }

    public static boolean reachedTarget(Instant cursor, Instant targetFrom) {
        return !cursor.isAfter(targetFrom);
    }
}
