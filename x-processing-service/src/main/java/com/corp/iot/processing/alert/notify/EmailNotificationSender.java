package com.corp.iot.processing.alert.notify;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailNotificationSender {

    private final JavaMailSender mailSender;
    private final AlertMessageFormatter formatter;

    @Value("${app.alert.mail-from:alert@iiot.local}")
    private String from;

    public void send(String address, AlertNotification notification) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(address);
        message.setSubject(formatter.subject(notification));
        message.setText(formatter.body(notification));
        mailSender.send(message);
        log.info("Đã gửi email cảnh báo rule={} tới {}", notification.alertRuleId(), address);
    }
}
