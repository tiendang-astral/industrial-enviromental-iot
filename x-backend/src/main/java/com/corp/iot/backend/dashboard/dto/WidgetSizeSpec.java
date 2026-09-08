package com.corp.iot.backend.dashboard.dto;

import java.util.Map;

/**
 * Cỡ mặc định của widget theo loại. Trước đây mọi loại đều dùng chung 4x3 nên áp mẫu cho ra biểu đồ
 * đúng bằng cỡ ô số.
 *
 * <p>Sàn/trần khi người dùng kéo-resize nằm ở frontend ({@code src/lib/dashboardLayout.ts}) — đó là
 * ràng buộc tương tác, không phải ràng buộc dữ liệu. Cột {@code w}/{@code h} dưới đây phải khớp với
 * cỡ mặc định trong bảng đó.
 */
public record WidgetSizeSpec(int w, int h) {

    private static final WidgetSizeSpec FALLBACK = new WidgetSizeSpec(3, 2);

    private static final Map<String, WidgetSizeSpec> BY_TYPE = Map.of(
            "VALUE", new WidgetSizeSpec(3, 2),
            "LINE", new WidgetSizeSpec(6, 4),
            "SWITCH", new WidgetSizeSpec(3, 2),
            "DEVICES_ONLINE", new WidgetSizeSpec(3, 2),
            "DEVICE_LIST", new WidgetSizeSpec(4, 4)
    );

    /** Loại lạ (template seed cũ, widget của phase sau) rơi về cỡ ô số thay vì ném lỗi. */
    public static WidgetSizeSpec of(String widgetType) {
        return BY_TYPE.getOrDefault(widgetType, FALLBACK);
    }
}
