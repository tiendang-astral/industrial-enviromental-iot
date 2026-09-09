package com.corp.iot.backend.dashboard.dto;

import java.util.Map;

/**
 * Sàn/trần kích thước theo loại widget. Backend dùng để **kẹp toạ độ mẫu khai** — mẫu viết tay
 * trong migration nên phải có lưới chắn, không thì một con số gõ nhầm đi thẳng vào `layout_json`.
 *
 * <p>Phải khớp bảng trong `x-frontend/src/lib/dashboardLayout.ts` (nơi kẹp lúc người dùng kéo).
 */
public record WidgetSizeSpec(int minW, int maxW, int minH, int maxH) {

    public static final int GRID_COLS = 12;

    private static final WidgetSizeSpec FALLBACK = new WidgetSizeSpec(2, 6, 2, 4);

    private static final Map<String, WidgetSizeSpec> BY_TYPE = Map.of(
            "VALUE", new WidgetSizeSpec(2, 6, 2, 4),
            "LINE", new WidgetSizeSpec(4, 12, 3, 8),
            "SWITCH", new WidgetSizeSpec(2, 4, 2, 2),
            "DEVICES_ONLINE", new WidgetSizeSpec(2, 4, 2, 3),
            "DEVICE_LIST", new WidgetSizeSpec(3, 12, 3, 8)
    );

    public static WidgetSizeSpec of(String widgetType) {
        return BY_TYPE.getOrDefault(widgetType, FALLBACK);
    }

    /** Kẹp về trong biên hợp lệ; `x` bị đẩy vào lưới sau khi đã biết bề rộng thật. */
    public static WidgetLayout clamp(WidgetLayout layout, String widgetType) {
        WidgetSizeSpec spec = of(widgetType);
        int w = Math.clamp(layout.w(), spec.minW(), spec.maxW());
        int h = Math.clamp(layout.h(), spec.minH(), spec.maxH());
        int x = Math.clamp(layout.x(), 0, GRID_COLS - w);
        return new WidgetLayout(x, Math.max(layout.y(), 0), w, h);
    }
}
