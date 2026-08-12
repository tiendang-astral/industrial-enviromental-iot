package com.corp.iot.ingestion.repository;

import com.corp.iot.ingestion.entity.Gateway;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GatewayRepository extends JpaRepository<Gateway, Long> {

    Optional<Gateway> findByMacAddressAndDeletedAtIsNull(String macAddress);
}
