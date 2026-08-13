package com.corp.iot.backend.externalsourcejob.repository;

import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExternalSourceJobRepository extends JpaRepository<ExternalSourceJob, Long> {

    List<ExternalSourceJob> findByExternalSourceId(Long externalSourceId);

    boolean existsByExternalSourceId(Long externalSourceId);
}
