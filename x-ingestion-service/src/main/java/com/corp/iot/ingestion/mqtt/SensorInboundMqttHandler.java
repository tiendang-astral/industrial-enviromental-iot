package com.corp.iot.ingestion.mqtt;

import com.corp.iot.ingestion.dto.GatewayBatchPayload;
import com.corp.iot.ingestion.dto.SensorReadingEvent;
import com.corp.iot.ingestion.producer.MessageIdGenerator;
import com.corp.iot.ingestion.producer.SensorDataRawProducer;
import com.corp.iot.ingestion.service.GatewayResolverService;
import com.corp.iot.ingestion.service.ResolvedGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Nhận batch JSON từ topic gateway/{mac_address}/data, resolve gateway, unbundle
// từng reading thành 1 Kafka message riêng (xem contract ở ARCHITECTURE.md).
@Slf4j
@Component
@RequiredArgsConstructor
public class SensorInboundMqttHandler {

    private static final Pattern TOPIC_PATTERN = Pattern.compile("^gateway/([^/]+)/data$");

    private final ObjectMapper objectMapper;
    private final GatewayResolverService gatewayResolverService;
    private final MessageIdGenerator messageIdGenerator;
    private final SensorDataRawProducer sensorDataRawProducer;

    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handle(Message<?> message) {
        String topic = (String) message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC);
        String macAddress = extractMacAddress(topic);
        if (macAddress == null) {
            log.warn("Received MQTT message on unexpected topic={}, ignoring", topic);
            return;
        }

        GatewayBatchPayload payload = parsePayload(message.getPayload(), macAddress);
        if (payload == null || payload.measuredAt() == null || payload.readings() == null || payload.readings().isEmpty()) {
            log.warn("Empty/invalid batch payload from mac_address={}", macAddress);
            return;
        }

        Optional<ResolvedGateway> resolved = gatewayResolverService.resolve(macAddress);
        if (resolved.isEmpty()) {
            return; // đã log lý do ở GatewayResolverService
        }
        ResolvedGateway gateway = resolved.get();

        String correlationId = UUID.randomUUID().toString();
        for (GatewayBatchPayload.Reading reading : payload.readings()) {
            if (reading.type() == null || reading.pinNumber() == null || reading.value() == null) {
                log.warn("Skip invalid reading in batch from mac_address={}: {}", macAddress, reading);
                continue;
            }
            String messageId = messageIdGenerator.generate(macAddress, reading.type(), reading.pinNumber(), payload.measuredAt());
            SensorReadingEvent event = new SensorReadingEvent(
                    messageId, gateway.tenantId(), gateway.gatewayId(), gateway.tenantNodeId(),
                    macAddress, reading.type(), reading.pinNumber(), reading.value(), payload.measuredAt());
            sensorDataRawProducer.send(event, correlationId);
        }
    }

    private GatewayBatchPayload parsePayload(Object rawPayload, String macAddress) {
        try {
            String json = rawPayload instanceof byte[] bytes ? new String(bytes) : rawPayload.toString();
            return objectMapper.readValue(json, GatewayBatchPayload.class);
        } catch (Exception e) {
            log.error("Failed to parse MQTT payload from mac_address={}", macAddress, e);
            return null;
        }
    }

    private String extractMacAddress(String topic) {
        if (topic == null) {
            return null;
        }
        Matcher matcher = TOPIC_PATTERN.matcher(topic);
        return matcher.matches() ? matcher.group(1) : null;
    }
}
