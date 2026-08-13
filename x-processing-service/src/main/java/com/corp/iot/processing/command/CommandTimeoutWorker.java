package com.corp.iot.processing.command;

import com.corp.iot.processing.entity.Command;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.CommandRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

// Quét command PENDING/DISPATCHED quá timeout_at -> TIMED_OUT (xem ARCHITECTURE.md
// § Flow: Command / Relay control, bước 8) — trường hợp dispatch MQTT thành công nhưng
// Gateway không bao giờ ACK (mất kết nối, hỏng...).
@Slf4j
@Service
@RequiredArgsConstructor
public class CommandTimeoutWorker {

    private static final List<String> PENDING_STATUSES = List.of("PENDING", "DISPATCHED");
    private static final String STATUS_TIMED_OUT = "TIMED_OUT";

    private final CommandRepository commandRepository;
    private final RealtimePublisher realtimePublisher;

    @Scheduled(fixedDelayString = "${app.command.timeout-worker-interval-ms}")
    @Transactional
    public void sweep() {
        List<Command> expired = commandRepository.findByStatusInAndTimeoutAtBefore(PENDING_STATUSES, Instant.now());
        for (Command command : expired) {
            command.setStatus(STATUS_TIMED_OUT);
            command.setError("Hết thời gian chờ ACK từ Gateway");
            commandRepository.save(command);
            log.info("Command commandId={} timed out", command.getId());
            realtimePublisher.publishCommandStatus(
                    command.getTenantId(), command.getTenantNodeId(), command.getId(),
                    STATUS_TIMED_OUT, null, command.getError());
        }
    }
}
