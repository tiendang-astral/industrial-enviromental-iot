package com.corp.iot.processing.command;

import com.corp.iot.processing.dto.CommandAckPayload;
import com.corp.iot.processing.entity.Command;
import com.corp.iot.processing.entity.GatewayPin;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.CommandRepository;
import com.corp.iot.processing.repository.GatewayPinRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

// Xử lý ACK Gateway gửi về qua MQTT (xem ARCHITECTURE.md § Flow: Command / Relay control,
// bước 7) — cập nhật command.status + gateway_pin.power_reported_state, publish realtime.
@Slf4j
@Service
@RequiredArgsConstructor
public class CommandAckService {

    private static final String DIRECTION_OUTPUT = "OUTPUT";
    private static final String STATUS_ACKNOWLEDGED = "ACKNOWLEDGED";
    private static final String STATUS_FAILED = "FAILED";
    private static final String RESULT_ACK = "ACK";

    private final CommandRepository commandRepository;
    private final GatewayPinRepository gatewayPinRepository;
    private final RealtimePublisher realtimePublisher;

    @Transactional
    public void handleAck(CommandAckPayload ack) {
        Optional<Command> commandOpt = commandRepository.findById(ack.commandId());
        if (commandOpt.isEmpty()) {
            log.warn("No command found for commandId={} in ACK, skip", ack.commandId());
            return;
        }
        Command command = commandOpt.get();

        String powerReportedState = null;
        if (RESULT_ACK.equals(ack.result())) {
            Optional<GatewayPin> pin = gatewayPinRepository.findByGatewayIdAndTypeAndPinNumberAndDirection(
                    command.getGatewayId(), ack.pinType(), ack.pinNumber(), DIRECTION_OUTPUT);
            if (pin.isPresent()) {
                pin.get().setPowerReportedState(ack.state());
                gatewayPinRepository.save(pin.get());
                powerReportedState = ack.state();
            } else {
                log.warn("No matching OUTPUT gateway_pin for gatewayId={}, type={}, pinNumber={}",
                        command.getGatewayId(), ack.pinType(), ack.pinNumber());
            }
        }

        Instant now = Instant.now();
        command.setAckPayloadJson(ack);
        command.setAcknowledgedAt(now);
        command.setCompletedAt(now);
        String error = null;
        if (RESULT_ACK.equals(ack.result())) {
            command.setStatus(STATUS_ACKNOWLEDGED);
        } else {
            command.setStatus(STATUS_FAILED);
            error = "Gateway từ chối lệnh (NACK)";
            command.setError(error);
        }
        commandRepository.save(command);

        realtimePublisher.publishCommandStatus(
                command.getTenantId(), command.getTenantNodeId(), command.getId(),
                command.getStatus(), powerReportedState, error);
    }
}
