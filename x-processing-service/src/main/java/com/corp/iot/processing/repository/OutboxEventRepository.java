package com.corp.iot.processing.repository;

import com.corp.iot.processing.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Query("SELECT e FROM OutboxEvent e WHERE e.status IN ('PENDING', 'FAILED') "
            + "AND (e.nextAttemptAt IS NULL OR e.nextAttemptAt <= :now) ORDER BY e.occurredAt")
    List<OutboxEvent> findDueForDispatch(Instant now);
}
