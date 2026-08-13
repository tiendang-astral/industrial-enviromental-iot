package com.corp.iot.processing.mqtt;

import com.corp.iot.processing.command.CommandAckService;
import com.corp.iot.processing.dto.CommandAckPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

// Nhận ACK từ topic gateway/{mac_address}/ack (xem ARCHITECTURE.md § Contract MQTT
// Command/ACK) — commandId trong payload đã đủ để tra command, không cần resolve mac_address
// ở đây (khác SensorInboundMqttHandler cần resolve mac -> gatewayId vì payload sensor không
// có commandId để tra thẳng).
@Slf4j
@Component
@RequiredArgsConstructor
public class CommandAckMqttHandler {

    private final ObjectMapper objectMapper;
    private final CommandAckService commandAckService;

    @ServiceActivator(inputChannel = "mqttAckInputChannel")
    public void handle(Message<?> message) {
        String topic = (String) message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC);
        CommandAckPayload ack = parsePayload(message.getPayload());
        if (ack == null || ack.commandId() == null || ack.result() == null) {
            log.warn("Invalid ACK payload from topic={}", topic);
            return;
        }

        try {
            commandAckService.handleAck(ack);
        } catch (Exception e) {
            log.error("Failed to handle ACK commandId={}", ack.commandId(), e);
        }
    }

    private CommandAckPayload parsePayload(Object rawPayload) {
        try {
            String json = rawPayload instanceof byte[] bytes ? new String(bytes) : rawPayload.toString();
            return objectMapper.readValue(json, CommandAckPayload.class);
        } catch (Exception e) {
            log.error("Failed to parse MQTT ACK payload", e);
            return null;
        }
    }
}
