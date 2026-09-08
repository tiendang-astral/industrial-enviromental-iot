package com.corp.iot.processing.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
public class AsyncConfig {

    @Value("${app.alert.notify-pool-size:2}")
    private int notifyPoolSize;

    @Bean("alertNotifyExecutor")
    public Executor alertNotifyExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(notifyPoolSize);
        executor.setMaxPoolSize(notifyPoolSize);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("alert-notify-");
        // Hàng đợi đầy (SMTP/Telegram treo dài) thì gửi ngay trên thread gọi còn hơn mất cảnh báo.
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
