package com.corp.iot.backend.command.repository;

import com.corp.iot.backend.command.entity.Command;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CommandRepository extends JpaRepository<Command, UUID> {

    Optional<Command> findByRequestedByAndIdempotencyKey(Long requestedBy, String idempotencyKey);
}
