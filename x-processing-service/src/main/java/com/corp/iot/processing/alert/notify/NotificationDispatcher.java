package com.corp.iot.processing.alert.notify;

import com.corp.iot.processing.entity.AlertChannel;
import com.corp.iot.processing.repository.AlertChannelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Gửi cảnh báo ra kênh ngoài ở thread pool riêng: SMTP/Telegram chậm hoặc treo không được phép
 * chặn Kafka consumer đang ghi telemetry (CONVENTIONS.md §2 — notification tách khỏi luồng chính).
 * Lỗi gửi chỉ log, không throw ngược lại.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationDispatcher {

    private final AlertChannelRepository alertChannelRepository;
    private final EmailNotificationSender emailNotificationSender;
    private final TelegramNotificationSender telegramNotificationSender;

    @Async("alertNotifyExecutor")
    public void dispatch(AlertNotification notification) {
        for (AlertChannel channel : alertChannelRepository.findByAlertRuleId(notification.alertRuleId())) {
            try {
                switch (channel.getChannelType()) {
                    case "EMAIL" -> emailNotificationSender.send(channel.getAddress(), notification);
                    case "TELEGRAM" -> telegramNotificationSender.send(
                            channel.getTelegramBotToken(), channel.getAddress(), notification);
                    default -> log.warn("Kênh không hỗ trợ: {}", channel.getChannelType());
                }
            } catch (Exception e) {
                log.error("Gửi cảnh báo qua {} tới {} thất bại", channel.getChannelType(), channel.getAddress(), e);
            }
        }
    }
}
