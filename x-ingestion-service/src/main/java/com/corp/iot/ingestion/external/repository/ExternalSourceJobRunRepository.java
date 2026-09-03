package com.corp.iot.ingestion.external.repository;

import com.corp.iot.ingestion.external.entity.ExternalSourceJobRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;

public interface ExternalSourceJobRunRepository extends JpaRepository<ExternalSourceJobRun, Long> {

    // Bảng log chạy mỗi phút/job — không giữ mãi. Trang chi tiết chỉ đọc 12 giờ gần nhất.
    @Modifying
    @Query("DELETE FROM ExternalSourceJobRun r WHERE r.startedAt < :before")
    int deleteOlderThan(Instant before);
}
