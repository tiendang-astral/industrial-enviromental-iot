package com.corp.iot.processing.command;

import com.corp.iot.processing.dto.CommandMqttPayload;
import com.corp.iot.processing.dto.CommandOutboxPayload;
import com.corp.iot.processing.entity.Command;
import com.corp.iot.processing.entity.Gateway;
import com.corp.iot.processing.mqtt.CommandMqttPublisher;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.CommandRepository;
import com.corp.iot.processing.repository.GatewayRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

// Consume gateway-commands (qua GatewayCommandsListener) -> publish MQTT xuống Gateway,
// retry đồng bộ tối đa N lần nếu lỗi (EMQX down...) trước khi đánh dấu FAILED (xem
// ARCHITECTURE.md § Chính sách retry/timeout — giữ đơn giản, không exponential backoff).
@Slf4j
@Service
@RequiredArgsConstructor
public class CommandDispatchService {

    private static final String STATUS_DISPATCHED = "DISPATCHED";
    private static final String STATUS_FAILED = "FAILED";

    private final GatewayRepository gatewayRepository;
    private final CommandRepository commandRepository;
    private final CommandMqttPublisher commandMqttPublisher;
    private final RealtimePublisher realtimePublisher;

    @Value("${app.command.mqtt-publish-max-retries}")
    private int maxRetries;

    @Value("${app.command.mqtt-publish-retry-delay-ms}")
    private long retryDelayMs;

    public void dispatch(CommandOutboxPayload event) {
        Optional<Command> commandOpt = commandRepository.findById(event.commandId());
        if (commandOpt.isEmpty()) {
            log.warn("No command found for commandId={}, skip dispatch", event.commandId());
            return;
        }
        Command command = commandOpt.get();

        Optional<Gateway> gateway = gatewayRepository.findById(event.gatewayId());
        if (gateway.isEmpty() || gateway.get().getMacAddress() == null) {
            markFailed(command, event, "Gateway không tồn tại hoặc chưa có mac_address");
            return;
        }

        CommandMqttPayload payload = new CommandMqttPayload(event.commandId(), event.pinType(), event.pinNumber(), event.commandType());
        int attempt = 0;
        while (attempt < maxRetries) {
            attempt++;
            try {
                commandMqttPublisher.publish(gateway.get().getMacAddress(), payload);
                markDispatched(command, event, attempt);
                return;
            } catch (Exception e) {
                log.warn("MQTT publish attempt {}/{} failed for commandId={}", attempt, maxRetries, event.commandId(), e);
                if (attempt < maxRetries) {
                    sleep(retryDelayMs);
                }
            }
        }
        markFailed(command, event, "Không publish được lệnh xuống MQTT sau " + maxRetries + " lần thử");
    }

    private void markDispatched(Command command, CommandOutboxPayload event, int retryCount) {
        command.setStatus(STATUS_DISPATCHED);
        command.setDispatchedAt(Instant.now());
        command.setRetryCount(retryCount - 1);
        commandRepository.save(command);
        realtimePublisher.publishCommandStatus(event.tenantId(), event.tenantNodeId(), event.commandId(), STATUS_DISPATCHED, null, null);
    }

    private void markFailed(Command command, CommandOutboxPayload event, String error) {
        command.setStatus(STATUS_FAILED);
        command.setRetryCount(maxRetries);
        command.setError(error);
        commandRepository.save(command);
        realtimePublisher.publishCommandStatus(event.tenantId(), event.tenantNodeId(), event.commandId(), STATUS_FAILED, null, error);
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
