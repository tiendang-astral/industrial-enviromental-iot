package com.corp.iot.processing.repository;

import com.corp.iot.processing.entity.Command;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CommandRepository extends JpaRepository<Command, UUID> {

    List<Command> findByStatusInAndTimeoutAtBefore(List<String> statuses, Instant now);
}
