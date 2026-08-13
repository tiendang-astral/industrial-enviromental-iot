package com.corp.iot.backend.externalsourcejob.mapper;

import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceJobResponse;
import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJob;
import org.springframework.stereotype.Component;

@Component
public class ExternalSourceJobMapper {

    public ExternalSourceJobResponse toResponse(ExternalSourceJob job) {
        return new ExternalSourceJobResponse(
                job.getId(),
                job.getExternalSourceId(),
                job.getName(),
                job.getQueryConfig(),
                job.getFilterConfig(),
                job.getScheduleCron(),
                job.getIncrementalCursor(),
                job.getTotalRowCount(),
                job.getLastRunStatus() != null ? job.getLastRunStatus().name() : null,
                job.getLastRunAt(),
                job.getNextRunAt(),
                job.getLastError()
        );
    }
}
