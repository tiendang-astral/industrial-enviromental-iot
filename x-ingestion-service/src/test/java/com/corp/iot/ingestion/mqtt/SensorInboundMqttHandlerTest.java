package com.corp.iot.ingestion.mqtt;

import com.corp.iot.ingestion.dto.SensorReadingEvent;
import com.corp.iot.ingestion.producer.MessageIdGenerator;
import com.corp.iot.ingestion.producer.SensorDataRawProducer;
import com.corp.iot.ingestion.service.GatewayResolverService;
import com.corp.iot.ingestion.service.ResolvedGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.support.MessageBuilder;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SensorInboundMqttHandlerTest {

    private static final String MAC = "AA:BB:CC:DD:EE:FF";

    private GatewayResolverService gatewayResolverService;
    private SensorDataRawProducer sensorDataRawProducer;
    private SensorInboundMqttHandler handler;

    @BeforeEach
    void setUp() {
        gatewayResolverService = mock(GatewayResolverService.class);
        sensorDataRawProducer = mock(SensorDataRawProducer.class);
        handler = new SensorInboundMqttHandler(
                new ObjectMapper(), gatewayResolverService,
                new MessageIdGenerator(), sensorDataRawProducer);
    }

    @Test
    void unbundlesBatchIntoOneKafkaEventPerReading() {
        when(gatewayResolverService.resolve(MAC)).thenReturn(Optional.of(new ResolvedGateway(34L, 12L, 56L)));

        String payload = """
                {
                  "measuredAt": "2026-08-12T09:41:00Z",
                  "readings": [
                    { "type": "AI", "pinNumber": 1, "value": 23.5 },
                    { "type": "DI", "pinNumber": 1, "value": 1 }
                  ]
                }
                """;
        handler.handle(mqttMessage(payload, "gateway/" + MAC + "/data"));

        ArgumentCaptor<SensorReadingEvent> eventCaptor = ArgumentCaptor.forClass(SensorReadingEvent.class);
        ArgumentCaptor<String> correlationCaptor = ArgumentCaptor.forClass(String.class);
        verify(sensorDataRawProducer, times(2)).send(eventCaptor.capture(), correlationCaptor.capture());

        var events = eventCaptor.getAllValues();
        assertThat(events).hasSize(2);
        assertThat(events.get(0).tenantId()).isEqualTo(12L);
        assertThat(events.get(0).gatewayId()).isEqualTo(34L);
        assertThat(events.get(0).tenantNodeId()).isEqualTo(56L);
        assertThat(events.get(0).pinType()).isEqualTo("AI");
        assertThat(events.get(0).value()).isEqualTo(23.5);
        assertThat(events.get(1).pinType()).isEqualTo("DI");
        // Cùng 1 batch phải chia sẻ chung correlationId (trace xuyên Kafka header).
        assertThat(correlationCaptor.getAllValues().get(0)).isEqualTo(correlationCaptor.getAllValues().get(1));
    }

    @Test
    void ignoresMessageOnUnexpectedTopic() {
        handler.handle(mqttMessage("{}", "some/other/topic"));

        verify(sensorDataRawProducer, never()).send(any(), anyString());
        verify(gatewayResolverService, never()).resolve(anyString());
    }

    @Test
    void dropsBatchWhenGatewayNotResolved() {
        when(gatewayResolverService.resolve(MAC)).thenReturn(Optional.empty());

        String payload = """
                { "measuredAt": "2026-08-12T09:41:00Z", "readings": [ { "type": "AI", "pinNumber": 1, "value": 1.0 } ] }
                """;
        handler.handle(mqttMessage(payload, "gateway/" + MAC + "/data"));

        verify(sensorDataRawProducer, never()).send(any(), anyString());
    }

    @Test
    void skipsInvalidReadingButKeepsProcessingOthers() {
        when(gatewayResolverService.resolve(MAC)).thenReturn(Optional.of(new ResolvedGateway(34L, 12L, 56L)));

        String payload = """
                {
                  "measuredAt": "2026-08-12T09:41:00Z",
                  "readings": [
                    { "type": "AI", "pinNumber": null, "value": 1.0 },
                    { "type": "DI", "pinNumber": 2, "value": 1 }
                  ]
                }
                """;
        handler.handle(mqttMessage(payload, "gateway/" + MAC + "/data"));

        verify(sensorDataRawProducer, times(1)).send(any(), anyString());
    }

    private org.springframework.messaging.Message<String> mqttMessage(String payload, String topic) {
        return MessageBuilder.withPayload(payload)
                .setHeader(MqttHeaders.RECEIVED_TOPIC, topic)
                .build();
    }
}
