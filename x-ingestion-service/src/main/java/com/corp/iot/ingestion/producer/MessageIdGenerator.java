package com.corp.iot.ingestion.producer;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

// Sinh messageId deterministic từ (mac_address, pinType, pinNumber, measuredAt) — Ingestion
// tự sinh thay vì phụ thuộc gateway thật gửi messageId (quyết định PLAN.md Phase 3), đảm bảo
// dedup key (Redis telemetry-dedup) luôn tồn tại và ổn định qua các lần publish trùng lặp.
@Component
public class MessageIdGenerator {

    public String generate(String macAddress, String pinType, Integer pinNumber, Instant measuredAt) {
        String raw = macAddress + ":" + pinType + ":" + pinNumber + ":" + measuredAt.toEpochMilli();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
