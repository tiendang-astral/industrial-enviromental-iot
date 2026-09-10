package com.corp.iot.processing.repository;

import com.corp.iot.processing.entity.ExternalSourceJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ExternalSourceJobRepository extends JpaRepository<ExternalSourceJob, Long> {

    /** Tra cả lô một lượt: một lô số đo thường chỉ đến từ vài job. */
    List<ExternalSourceJob> findByIdIn(Collection<Long> ids);
}
