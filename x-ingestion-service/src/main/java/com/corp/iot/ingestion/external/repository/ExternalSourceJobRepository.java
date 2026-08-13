package com.corp.iot.ingestion.external.repository;

import com.corp.iot.ingestion.external.entity.ExternalSourceJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface ExternalSourceJobRepository extends JpaRepository<ExternalSourceJob, Long> {

    // Job có nguồn cũng bị soft-delete (deleted_at) — join loại bỏ luôn job của nguồn đã xóa.
    @Query("""
            SELECT j FROM ExternalSourceJob j, ExternalSource s
            WHERE j.externalSourceId = s.id
              AND j.deletedAt IS NULL AND s.deletedAt IS NULL
              AND j.nextRunAt <= :now
            """)
    List<ExternalSourceJob> findDueJobs(@Param("now") Instant now);
}
