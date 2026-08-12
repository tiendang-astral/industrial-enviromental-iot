package com.corp.iot.processing.repository;

import com.corp.iot.processing.entity.GatewayPin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GatewayPinRepository extends JpaRepository<GatewayPin, Long> {

    Optional<GatewayPin> findByGatewayIdAndTypeAndPinNumberAndDirection(
            Long gatewayId, String type, Integer pinNumber, String direction);
}
