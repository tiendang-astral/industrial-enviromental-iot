package com.corp.iot.processing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling cho OutboxPollerService + CommandTimeoutWorker (Phase 7 — xem
// ARCHITECTURE.md § Flow: Command / Relay control).
// @EnableAsync cho NotificationDispatcher (Phase 6a — gửi email/telegram ngoài thread consumer).
@SpringBootApplication
@EnableScheduling
@EnableAsync
public class ProcessingServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ProcessingServiceApplication.class, args);
	}

}
