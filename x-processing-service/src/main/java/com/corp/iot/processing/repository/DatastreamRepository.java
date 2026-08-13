package com.corp.iot.processing.repository;

import com.corp.iot.processing.entity.Datastream;
import com.corp.iot.processing.entity.SourceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DatastreamRepository extends JpaRepository<Datastream, Long> {

    Optional<Datastream> findBySourceTypeAndSourceIdAndSourceField(SourceType sourceType, Long sourceId, String sourceField);
}
