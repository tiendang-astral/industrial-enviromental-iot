package com.corp.iot.processing.alert;

/** Kết quả một lần chạy state machine — quyết định có gửi cảnh báo và đẩy realtime hay không. */
public enum AlertTransition {
    /** Không đổi trạng thái đáng kể (chỉ cập nhật giá trị quan sát, hoặc vẫn đang đếm duration). */
    NONE,
    /** Vừa lên ACTIVE — gửi cảnh báo. */
    ACTIVATED,
    /** Vừa về RECOVERED sau khi đã từng ACTIVE — báo đã hết sự cố. */
    RECOVERED
}
