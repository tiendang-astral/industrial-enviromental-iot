package com.corp.iot.backend.dashboard.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Nguồn dữ liệu của widget. NULL với widget tổng hợp theo node (DEVICE_LIST/DEVICES_ONLINE).
 *
 * <p>Bốn field vì `layout_json` mang hai thế hệ dữ liệu cùng lúc: board lưu trước khi có widget đa
 * kênh dùng {@code datastreamId} số ít, board mới dùng {@code datastreamIds}. Record phải khai đủ
 * mọi field có thật trong JSON — Jackson bỏ im lặng field không khai, và vì đường lưu board là
 * đọc-rồi-ghi-lại nên field bị bỏ sẽ **mất hẳn khỏi DB** (widget SWITCH từng chết theo cách này:
 * gửi lên {@code {gatewayId, pinId}}, đọc lại thành {@code {datastreamId: null}}).
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record WidgetBinding(
        Long datastreamId,
        List<Long> datastreamIds,
        Long gatewayId,
        Long pinId
) {

    /** Một chỗ duy nhất hiểu cả hai thế hệ dữ liệu. */
    public List<Long> resolvedDatastreamIds() {
        if (datastreamIds != null && !datastreamIds.isEmpty()) {
            return datastreamIds;
        }
        return datastreamId != null ? List.of(datastreamId) : List.of();
    }

    public static WidgetBinding ofDatastreams(List<Long> ids) {
        return new WidgetBinding(null, ids, null, null);
    }
}
