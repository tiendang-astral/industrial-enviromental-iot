package com.corp.iot.processing.repository;

import com.corp.iot.processing.entity.Gateway;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

public interface GatewayRepository extends JpaRepository<Gateway, Long> {

    // Native update (không load entity) — luồng realtime duy nhất được phép ghi
    // last_seen_at (xem comment trong x-backend Gateway.java).
    @Modifying
    @Transactional
    @Query("UPDATE Gateway g SET g.lastSeenAt = :seenAt WHERE g.id = :id")
    void touchLastSeenAt(@Param("id") Long id, @Param("seenAt") Instant seenAt);
}
