package com.corp.iot.processing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Entity riêng của Processing Service, chỉ khai field cần để resolve
// (gatewayId, type, pinNumber, direction) -> metric_id + enabled trước khi ghi InfluxDB.
@Entity
@Table(name = "gateway_pin")
@Getter
@Setter
@NoArgsConstructor
public class GatewayPin {

    @Id
    private Long id;

    @Column(name = "gateway_id", nullable = false)
    private Long gatewayId;

    @Column(nullable = false)
    private String direction;

    @Column(nullable = false)
    private String type;

    @Column(name = "pin_number", nullable = false)
    private Integer pinNumber;

    @Column(name = "metric_id")
    private Long metricId;

    @Column(nullable = false)
    private boolean enabled;
}
