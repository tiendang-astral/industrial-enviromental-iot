package com.corp.iot.backend.externalsourcejob.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.datastream.entity.SourceType;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.externalsource.repository.ExternalSourceRepository;
import com.corp.iot.backend.externalsourcejob.dto.CreateExternalSourceJobRequest;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceFilter;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceJobResponse;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceQueryConfig;
import com.corp.iot.backend.externalsourcejob.dto.UpdateExternalSourceJobRequest;
import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJob;
import com.corp.iot.backend.externalsourcejob.mapper.ExternalSourceJobMapper;
import com.corp.iot.backend.externalsourcejob.repository.ExternalSourceJobRepository;
import com.corp.iot.backend.externalsourcejob.util.CronNextRunCalculator;
import com.corp.iot.backend.externalsourcejob.util.SqlIdentifierValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ExternalSourceJobServiceImpl implements ExternalSourceJobService {

    private final ExternalSourceJobRepository externalSourceJobRepository;
    private final ExternalSourceRepository externalSourceRepository;
    private final DatastreamRepository datastreamRepository;
    private final ExternalSourceJobMapper externalSourceJobMapper;
    private final SqlIdentifierValidator sqlIdentifierValidator;
    private final CronNextRunCalculator cronNextRunCalculator;

    private static final Set<String> ALLOWED_OPERATORS = Set.of("=", "!=", ">", "<", ">=", "<=");

    @Override
    public List<ExternalSourceJobResponse> list(Long externalSourceId) {
        return externalSourceJobRepository.findByExternalSourceId(externalSourceId).stream()
                .map(externalSourceJobMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ExternalSourceJobResponse create(Long externalSourceId, CreateExternalSourceJobRequest request) {
        if (!externalSourceRepository.existsById(externalSourceId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "SOURCE_NOT_FOUND", "Không tìm thấy nguồn dữ liệu");
        }
        validateQueryConfig(request.queryConfig());
        validateFilterConfig(request.filterConfig());

        ExternalSourceJob job = new ExternalSourceJob();
        job.setExternalSourceId(externalSourceId);
        job.setName(request.name());
        job.setQueryConfig(request.queryConfig());
        job.setFilterConfig(request.filterConfig());
        job.setScheduleCron(request.scheduleCron());
        job.setTotalRowCount(0);
        job.setNextRunAt(cronNextRunCalculator.nextRunAfter(request.scheduleCron(), Instant.now()));
        externalSourceJobRepository.save(job);
        return externalSourceJobMapper.toResponse(job);
    }

    @Override
    @Transactional
    public ExternalSourceJobResponse update(Long id, UpdateExternalSourceJobRequest request) {
        ExternalSourceJob job = getOrThrow(id);
        job.setName(request.name());

        boolean queryChanged = request.queryConfig() != null && !Objects.equals(request.queryConfig(), job.getQueryConfig());
        boolean filterChanged = request.filterConfig() != null && !Objects.equals(request.filterConfig(), job.getFilterConfig());
        if (request.queryConfig() != null) {
            validateQueryConfig(request.queryConfig());
            job.setQueryConfig(request.queryConfig());
        }
        if (request.filterConfig() != null) {
            validateFilterConfig(request.filterConfig());
            job.setFilterConfig(request.filterConfig());
        }
        if (request.scheduleCron() != null) {
            job.setScheduleCron(request.scheduleCron());
            job.setNextRunAt(cronNextRunCalculator.nextRunAfter(request.scheduleCron(), Instant.now()));
        }
        // Cursor cũ có thể không còn hợp lệ với query/filter mới — reset để lần chạy tiếp
        // theo đọc lại từ đầu (xem DATABASE.md § external_source_job).
        if (queryChanged || filterChanged) {
            job.setIncrementalCursor(null);
        }

        externalSourceJobRepository.save(job);
        return externalSourceJobMapper.toResponse(job);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        ExternalSourceJob job = getOrThrow(id);
        if (datastreamRepository.existsBySourceTypeAndSourceId(SourceType.EXTERNAL_SOURCE_JOB, id)) {
            throw new BusinessException(HttpStatus.CONFLICT, "JOB_HAS_DATASTREAMS", "Job còn datastream gắn vào, không thể xóa");
        }
        job.setDeletedAt(Instant.now());
        externalSourceJobRepository.save(job);
    }

    private void validateQueryConfig(ExternalSourceQueryConfig config) {
        sqlIdentifierValidator.validate(config.table());
        sqlIdentifierValidator.validate(config.timestampColumn());
        config.valueColumns().forEach(sqlIdentifierValidator::validate);
    }

    private void validateFilterConfig(List<ExternalSourceFilter> filters) {
        if (filters == null) {
            return;
        }
        filters.forEach(filter -> {
            sqlIdentifierValidator.validate(filter.column());
            if (!ALLOWED_OPERATORS.contains(filter.operator())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_FILTER_OPERATOR", "Operator không hợp lệ: " + filter.operator());
            }
        });
    }

    private ExternalSourceJob getOrThrow(Long id) {
        return externalSourceJobRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "JOB_NOT_FOUND", "Không tìm thấy job"));
    }
}
