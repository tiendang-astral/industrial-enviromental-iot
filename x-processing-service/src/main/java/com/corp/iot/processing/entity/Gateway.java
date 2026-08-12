package com.corp.iot.processing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Chỉ cần id + last_seen_at — cột duy nhất luồng realtime (Phase 3) ghi trong Postgres.
@Entity
@Table(name = "gateway")
@Getter
@Setter
@NoArgsConstructor
public class Gateway {

    @Id
    private Long id;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;
}
