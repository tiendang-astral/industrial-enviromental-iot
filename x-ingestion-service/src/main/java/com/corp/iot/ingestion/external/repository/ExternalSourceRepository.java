package com.corp.iot.ingestion.external.repository;

import com.corp.iot.ingestion.external.entity.ExternalSource;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExternalSourceRepository extends JpaRepository<ExternalSource, Long> {
}
