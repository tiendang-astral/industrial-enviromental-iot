package com.corp.iot.processing.mqtt;

import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.core.MessageProducer;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.core.MqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

import java.util.UUID;

// Khác x-ingestion-service (chỉ inbound) — Processing Service vừa publish lệnh (outbound)
// vừa subscribe ACK (inbound) qua EMQX, client riêng độc lập với client của Ingestion Service
// (xem ARCHITECTURE.md § Contract MQTT Command/ACK).
@Configuration
public class MqttCommandConfig {

    @Value("${mqtt.broker-url}")
    private String brokerUrl;

    @Value("${mqtt.client-id}")
    private String clientId;

    @Value("${mqtt.ack-topic-filter}")
    private String ackTopicFilter;

    @Bean
    public MqttPahoClientFactory mqttCommandClientFactory() {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        MqttConnectOptions options = new MqttConnectOptions();
        options.setServerURIs(new String[]{brokerUrl});
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);
        factory.setConnectionOptions(options);
        return factory;
    }

    @Bean
    public MessageChannel mqttCommandOutboundChannel() {
        return new DirectChannel();
    }

    @Bean
    @ServiceActivator(inputChannel = "mqttCommandOutboundChannel")
    public MessageHandler mqttCommandOutboundHandler(MqttPahoClientFactory mqttCommandClientFactory) {
        // async=false (mặc định) để publish() chờ Paho token hoàn tất và ném exception ngay nếu
        // lỗi (mất kết nối EMQX...) — CommandDispatchService cần bắt lỗi đồng bộ để retry
        // (xem ARCHITECTURE.md § Chính sách retry/timeout), không dùng async fire-and-forget.
        MqttPahoMessageHandler handler = new MqttPahoMessageHandler(
                clientId + "-out-" + UUID.randomUUID(), mqttCommandClientFactory);
        handler.setDefaultQos(1);
        handler.setCompletionTimeout(5000);
        return handler;
    }

    @Bean
    public MessageChannel mqttAckInputChannel() {
        return new DirectChannel();
    }

    @Bean
    public MessageProducer mqttAckInbound(MqttPahoClientFactory mqttCommandClientFactory) {
        MqttPahoMessageDrivenChannelAdapter adapter = new MqttPahoMessageDrivenChannelAdapter(
                clientId + "-in-" + UUID.randomUUID(), mqttCommandClientFactory, ackTopicFilter);
        adapter.setCompletionTimeout(5000);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(1);
        adapter.setOutputChannel(mqttAckInputChannel());
        return adapter;
    }
}
