package com.corp.iot.processing.alert.notify;

import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Component
public class AlertMessageFormatter {

    private static final DateTimeFormatter TIME = DateTimeFormatter
            .ofPattern("HH:mm:ss dd/MM/yyyy")
            .withZone(ZoneId.systemDefault());

    public String subject(AlertNotification notification) {
        String prefix = notification.recovered()
                ? "[Đã hết]"
                : "CRITICAL".equals(notification.severity()) ? "[Nghiêm trọng]" : "[Cảnh báo]";
        return "%s %s — %s".formatted(prefix, notification.ruleName(), notification.datastreamName());
    }

    public String body(AlertNotification notification) {
        String headline = notification.recovered()
                ? "Sự cố đã kết thúc."
                : "Giá trị đo vượt ngưỡng cảnh báo.";
        return """
                %s

                Rule: %s
                Kênh dữ liệu: %s
                Giá trị: %s %s
                Thời điểm đo: %s
                """.formatted(
                headline,
                notification.ruleName(),
                notification.datastreamName(),
                formatValue(notification.value()),
                notification.unit() != null ? notification.unit() : "",
                TIME.format(notification.measuredAt())).trim();
    }

    private String formatValue(Double value) {
        if (value == null) {
            return "—";
        }
        return value == Math.floor(value) ? String.valueOf(value.longValue()) : String.valueOf(value);
    }
}
