package com.corp.iot.processing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Master data kiểu đo, chỉ cần "code" để gắn tag InfluxDB.
@Entity
@Table(name = "metric")
@Getter
@Setter
@NoArgsConstructor
public class Metric {

    @Id
    private Long id;

    @Column(nullable = false)
    private String code;
}
