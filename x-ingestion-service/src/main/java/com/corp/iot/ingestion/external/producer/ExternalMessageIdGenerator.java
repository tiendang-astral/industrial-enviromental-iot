package com.corp.iot.ingestion.external.producer;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

// Sinh messageId deterministic từ (externalSourceJobId, sourceField, measuredAt) — dedup key
// Redis telemetry-dedup dùng chung với luồng sensor (xem ARCHITECTURE.md § Flow: External
// source data). Tương tự MessageIdGenerator của luồng gateway nhưng khác tham số.
@Component
public class ExternalMessageIdGenerator {

    public String generate(Long externalSourceJobId, String sourceField, Instant measuredAt) {
        String raw = externalSourceJobId + ":" + sourceField + ":" + measuredAt.toEpochMilli();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
