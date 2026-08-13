package com.corp.iot.processing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Entity riêng của Processing Service, chỉ khai field cần để resolve
// (sourceType=EXTERNAL_SOURCE_JOB, sourceId=externalSourceJobId, sourceField) -> metric_id
// trước khi ghi InfluxDB external_reading (xem ARCHITECTURE.md § Flow: External source data).
@Entity
@Table(name = "datastream")
@Getter
@Setter
@NoArgsConstructor
public class Datastream {

    @Id
    private Long id;

    @Column(name = "metric_id", nullable = false)
    private Long metricId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false)
    private SourceType sourceType;

    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    @Column(name = "source_field")
    private String sourceField;
}
