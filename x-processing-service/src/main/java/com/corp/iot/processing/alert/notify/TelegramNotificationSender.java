package com.corp.iot.processing.alert.notify;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Gọi thẳng Telegram Bot API bằng HttpClient của JDK — service này không có
 * {@code spring-boot-starter-web}, thêm cả servlet container chỉ để gọi một REST API là thừa.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TelegramNotificationSender {

    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
    private final AlertMessageFormatter formatter;

    public void send(String botToken, String chatId, AlertNotification notification) {
        String text = formatter.subject(notification) + "\n\n" + formatter.body(notification);
        String form = "chat_id=" + encode(chatId) + "&text=" + encode(text);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.telegram.org/bot" + botToken + "/sendMessage"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .timeout(TIMEOUT)
                .POST(HttpRequest.BodyPublishers.ofString(form, StandardCharsets.UTF_8))
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.error("Telegram trả {} cho chat_id={}: {}", response.statusCode(), chatId, response.body());
                return;
            }
            log.info("Đã gửi Telegram cảnh báo rule={} tới chat_id={}", notification.alertRuleId(), chatId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Bị ngắt khi gửi Telegram tới chat_id={}", chatId, e);
        } catch (Exception e) {
            log.error("Gửi Telegram thất bại tới chat_id={}", chatId, e);
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
