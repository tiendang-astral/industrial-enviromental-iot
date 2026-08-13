package com.corp.iot.backend.command.service;

import com.corp.iot.backend.command.dto.CommandOutboxPayload;
import com.corp.iot.backend.command.dto.CommandParameters;
import com.corp.iot.backend.command.dto.CommandResponse;
import com.corp.iot.backend.command.dto.CreateCommandRequest;
import com.corp.iot.backend.command.entity.Command;
import com.corp.iot.backend.command.entity.CommandStatus;
import com.corp.iot.backend.command.entity.CommandType;
import com.corp.iot.backend.command.mapper.CommandMapper;
import com.corp.iot.backend.command.repository.CommandRepository;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.outbox.entity.OutboxEvent;
import com.corp.iot.backend.common.outbox.entity.OutboxStatus;
import com.corp.iot.backend.common.outbox.repository.OutboxEventRepository;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.gateway.entity.Gateway;
import com.corp.iot.backend.gateway.repository.GatewayRepository;
import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.gatewaypin.entity.PinDirection;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CommandServiceImpl implements CommandService {

    private final GatewayPinRepository gatewayPinRepository;
    private final GatewayRepository gatewayRepository;
    private final CommandRepository commandRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final CommandMapper commandMapper;

    @Value("${app.command.timeout-seconds}")
    private long timeoutSeconds;

    @Override
    @Transactional
    public CommandResponse create(Long gatewayId, Long pinId, CreateCommandRequest request) {
        GatewayPin pin = gatewayPinRepository.findById(pinId)
                .filter(p -> p.getGatewayId().equals(gatewayId))
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "PIN_NOT_FOUND", "Không tìm thấy pin"));
        if (pin.getDirection() != PinDirection.OUTPUT) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "PIN_NOT_OUTPUT", "Chỉ điều khiển được pin OUTPUT");
        }
        CommandType commandType = parseCommandType(request.commandType());
        AppUserPrincipal principal = currentPrincipal();

        Command existing = commandRepository.findByRequestedByAndIdempotencyKey(principal.userId(), request.idempotencyKey())
                .orElse(null);
        if (existing != null) {
            return commandMapper.toResponse(existing, pinId);
        }

        Gateway gateway = gatewayRepository.findById(gatewayId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "GATEWAY_NOT_FOUND", "Không tìm thấy gateway"));

        Instant now = Instant.now();
        Command command = new Command();
        command.setGatewayId(gatewayId);
        command.setTenantNodeId(gateway.getTenantNodeId());
        command.setCommandType(commandType);
        command.setParametersJson(new CommandParameters(pin.getType().name(), pin.getPinNumber()));
        command.setStatus(CommandStatus.PENDING);
        command.setRequestedBy(principal.userId());
        command.setRequestedAt(now);
        command.setTimeoutAt(now.plusSeconds(timeoutSeconds));
        command.setIdempotencyKey(request.idempotencyKey());
        commandRepository.save(command);

        OutboxEvent outboxEvent = new OutboxEvent();
        outboxEvent.setTenantId(principal.tenantId());
        outboxEvent.setAggregateType("command");
        outboxEvent.setAggregateId(command.getId());
        outboxEvent.setEventType("gateway-commands");
        outboxEvent.setPayloadJson(new CommandOutboxPayload(
                command.getId(), principal.tenantId(), gatewayId, command.getTenantNodeId(),
                pin.getType().name(), pin.getPinNumber(), commandType.name()));
        outboxEvent.setCorrelationId(command.getId());
        outboxEvent.setOccurredAt(now);
        outboxEvent.setStatus(OutboxStatus.PENDING);
        outboxEventRepository.save(outboxEvent);

        return commandMapper.toResponse(command, pinId);
    }

    private CommandType parseCommandType(String raw) {
        try {
            return CommandType.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_COMMAND", "commandType không hợp lệ");
        }
    }

    private AppUserPrincipal currentPrincipal() {
        return (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
