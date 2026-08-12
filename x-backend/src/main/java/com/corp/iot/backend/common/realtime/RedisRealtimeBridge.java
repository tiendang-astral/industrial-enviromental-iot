package com.corp.iot.backend.common.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

// Subscribe Redis pub/sub realtime:{tenantId}:{tenantNodeId} (Processing Service publish
// — xem DATABASE.md §5) và forward nguyên văn payload vào STOMP topic
// /topic/realtime/{tenantId}/{tenantNodeId} (đăng ký pattern ở RedisRealtimeConfig).
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisRealtimeBridge implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
        String payload = new String(message.getBody(), StandardCharsets.UTF_8);
        String topic = "/topic/" + channel.replace(":", "/");
        try {
            messagingTemplate.convertAndSend(topic, payload);
        } catch (Exception e) {
            log.error("Failed to forward realtime message from channel={} to topic={}", channel, topic, e);
        }
    }
}
