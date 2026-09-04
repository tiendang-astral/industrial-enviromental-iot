package com.corp.iot.backend.externalsourcejob.repository;

import com.corp.iot.backend.externalsourcejob.entity.BackfillStatus;
import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJobBackfill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExternalSourceJobBackfillRepository extends JpaRepository<ExternalSourceJobBackfill, Long> {

    Optional<ExternalSourceJobBackfill> findFirstByDatastreamIdOrderByCreatedAtDesc(Long datastreamId);

    boolean existsByDatastreamIdAndStatusIn(Long datastreamId, List<BackfillStatus> statuses);
}
