package com.corp.iot.processing.config;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

import java.util.HashMap;
import java.util.Map;

/**
 * Factory riêng cho topic {@code gateway-commands}.
 *
 * Telemetry và command có yêu cầu ngược nhau: telemetry gom lô để đạt thông lượng
 * ({@code spring.kafka.listener.type: batch}, {@code max-poll-records: 500}), còn lệnh bật/tắt relay
 * phải đi lẻ để người bấm nút thấy kết quả ngay. Config consumer trong {@code application.yml} là
 * của cả group nên không thể cùng lúc có hai chế độ — phải tách factory.
 */
@Configuration
public class KafkaConsumerConfig {

    /**
     * Áp cho listener telemetry (factory mặc định tự nhận CommonErrorHandler bean này).
     *
     * Hai loại lỗi, hai cách xử:
     *  - {@code BatchListenerFailedException} kèm chỉ số -> handler bỏ đúng message hỏng đó rồi chạy
     *    tiếp phần còn lại của lô, không đụng tới backoff.
     *  - Lỗi khác (InfluxDB/Redis/Postgres chết) -> retry cả lô, KHÔNG giới hạn số lần. Kafka là
     *    buffer chống cascading failure (CONVENTIONS.md § Resilience) nên chặn lại và chờ hạ tầng
     *    hồi đúng hơn là bỏ số đo. Đánh đổi: một lô hỏng vì bug sẽ chặn partition — nhìn ra bằng
     *    log ERROR mỗi lượt retry và bằng consumer lag trên Prometheus. DLQ topic vẫn còn nợ.
     */
    @Bean
    public DefaultErrorHandler kafkaErrorHandler() {
        return new DefaultErrorHandler(new FixedBackOff(2000L, FixedBackOff.UNLIMITED_ATTEMPTS));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> commandListenerFactory(KafkaProperties properties) {
        Map<String, Object> config = new HashMap<>(properties.buildConsumerProperties());
        // Lệnh đi lẻ: gom lô ở đây chỉ thêm độ trễ cho thao tác do người dùng bấm.
        config.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 1);
        // groupId "processing-command" là group MỚI. Với earliest (mặc định trong application.yml)
        // nó sẽ đọc lại toàn bộ gateway-commands từ đầu và bắn lại mọi lệnh relay cũ xuống thiết bị
        // thật. Lệnh đã qua thì không bao giờ nên phát lại — ép latest.
        config.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");

        ConcurrentKafkaListenerContainerFactory<String, String> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(config));
        // Ép record listener: factory mặc định sẽ theo listener.type=batch của telemetry.
        factory.setBatchListener(false);
        factory.setConcurrency(1);
        return factory;
    }
}
