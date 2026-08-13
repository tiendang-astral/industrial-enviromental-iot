package com.corp.iot.processing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// id + last_seen_at (Phase 3) + mac_address (Phase 7 — cần để build topic MQTT command
// gateway/{mac_address}/command, xem ARCHITECTURE.md § Flow: Command / Relay control).
@Entity
@Table(name = "gateway")
@Getter
@Setter
@NoArgsConstructor
public class Gateway {

    @Id
    private Long id;

    @Column(name = "mac_address")
    private String macAddress;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;
}
