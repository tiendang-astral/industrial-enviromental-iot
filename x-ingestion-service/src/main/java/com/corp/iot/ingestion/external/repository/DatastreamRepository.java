package com.corp.iot.ingestion.external.repository;

import com.corp.iot.ingestion.external.entity.Datastream;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DatastreamRepository extends JpaRepository<Datastream, Long> {
}
