package com.corp.iot.processing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Chỉ hai field service này cần: một truy vấn định kỳ thuộc nguồn nào.
 *
 * Số đo từ database ngoài chỉ mang id của TRUY VẤN (cũng là tag `external_source_job_id` trong
 * InfluxDB), còn quy tắc cảnh báo cho người dùng chọn theo NGUỒN — mối nối nằm ở đây.
 * Entity riêng của Processing Service, chỉ đọc; x-backend là nơi ghi cấu hình.
 */
@Entity
@Table(name = "external_source_job")
@Getter
@Setter
@NoArgsConstructor
public class ExternalSourceJob {

    @Id
    private Long id;

    @Column(name = "external_source_id", nullable = false)
    private Long externalSourceId;
}
