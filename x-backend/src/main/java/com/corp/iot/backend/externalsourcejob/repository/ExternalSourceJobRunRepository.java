package com.corp.iot.backend.externalsourcejob.repository;

import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJobRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface ExternalSourceJobRunRepository extends JpaRepository<ExternalSourceJobRun, Long> {

    List<ExternalSourceJobRun> findByExternalSourceJobIdAndStartedAtAfterOrderByStartedAtDesc(
            Long externalSourceJobId, Instant startedAt);
}
