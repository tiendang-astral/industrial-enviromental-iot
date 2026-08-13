package com.corp.iot.processing.mqtt;

import com.corp.iot.processing.dto.CommandMqttPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
public class CommandMqttPublisher {

    private final MessageChannel mqttCommandOutboundChannel;
    private final ObjectMapper objectMapper;

    // Throw ra ngoài nếu publish lỗi (không tự nuốt exception) — CommandDispatchService
    // chịu trách nhiệm retry/quyết định FAILED (xem ARCHITECTURE.md § Chính sách retry/timeout).
    public void publish(String macAddress, CommandMqttPayload payload) {
        String topic = "gateway/" + macAddress + "/command";
        String json = objectMapper.writeValueAsString(payload);
        Message<String> message = MessageBuilder.withPayload(json)
                .setHeader(MqttHeaders.TOPIC, topic)
                .build();
        boolean sent = mqttCommandOutboundChannel.send(message);
        if (!sent) {
            throw new IllegalStateException("MQTT publish to topic=" + topic + " was not accepted");
        }
    }
}
