package com.corp.iot.ingestion.external.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Entity riêng của Ingestion Service — chỉ khai field cần cho luồng vá lịch sử: biết vá cột
// nào (sourceField) và ghi lại dải dữ liệu đã có tới đâu (oldestReadingAt).
@Entity
@Table(name = "datastream")
@Getter
@Setter
@NoArgsConstructor
public class Datastream {

    @Id
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "tenant_node_id", nullable = false)
    private Long tenantNodeId;

    @Column(name = "source_field")
    private String sourceField;

    @Column(name = "oldest_reading_at")
    private Instant oldestReadingAt;
}
