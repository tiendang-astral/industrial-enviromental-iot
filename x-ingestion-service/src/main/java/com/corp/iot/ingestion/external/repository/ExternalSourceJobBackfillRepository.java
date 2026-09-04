package com.corp.iot.ingestion.external.repository;

import com.corp.iot.ingestion.external.entity.ExternalSourceJobBackfill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ExternalSourceJobBackfillRepository extends JpaRepository<ExternalSourceJobBackfill, Long> {

    // Cũ trước — tác vụ tạo sớm hơn được chạy xong trước, không để lượt mới chen ngang mãi.
    @Query("""
            SELECT b FROM ExternalSourceJobBackfill b
            WHERE b.status IN ('PENDING', 'RUNNING')
            ORDER BY b.createdAt
            """)
    List<ExternalSourceJobBackfill> findOpenTasks();
}
