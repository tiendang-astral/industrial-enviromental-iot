package com.corp.iot.backend.gatewaypin.repository;

import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.gatewaypin.entity.PinType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GatewayPinRepository extends JpaRepository<GatewayPin, Long> {

    List<GatewayPin> findByGatewayId(Long gatewayId);

    boolean existsByGatewayIdAndTypeAndPinNumber(Long gatewayId, PinType type, Integer pinNumber);
}
