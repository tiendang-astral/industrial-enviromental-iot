package com.corp.iot.backend.externalsourcejob.mapper;

import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceJobResponse;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceJobRunResponse;
import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJob;
import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJobRun;
import org.springframework.stereotype.Component;

@Component
public class ExternalSourceJobMapper {

    public ExternalSourceJobResponse toResponse(ExternalSourceJob job) {
        return new ExternalSourceJobResponse(
                job.getId(),
                job.getExternalSourceId(),
                job.getName(),
                job.getQueryConfig(),
                job.getScheduleCron(),
                job.getIncrementalCursor(),
                job.getTotalRowCount(),
                job.getLastRunStatus() != null ? job.getLastRunStatus().name() : null,
                job.getLastRunAt(),
                job.getNextRunAt(),
                job.getLastError()
        );
    }

    public ExternalSourceJobRunResponse toRunResponse(ExternalSourceJobRun run) {
        return new ExternalSourceJobRunResponse(
                run.getId(),
                run.getStatus().name(),
                run.getRowCount(),
                run.getError(),
                run.getStartedAt(),
                run.getFinishedAt()
        );
    }
}
