package com.corp.iot.processing.repository;

import com.corp.iot.processing.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    /** Khớp uq_alert_open (tenant_id, fingerprint) WHERE status IN ('PENDING','ACTIVE'). */
    Optional<Alert> findByTenantIdAndFingerprintAndStatusIn(
            Long tenantId, String fingerprint, Collection<String> statuses);
}
