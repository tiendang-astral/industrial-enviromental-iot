package com.corp.iot.processing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling cho OutboxPollerService + CommandTimeoutWorker (Phase 7 — xem
// ARCHITECTURE.md § Flow: Command / Relay control).
@SpringBootApplication
@EnableScheduling
public class ProcessingServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ProcessingServiceApplication.class, args);
	}

}
