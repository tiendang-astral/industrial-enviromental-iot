package com.corp.iot.backend.externalsourcejob.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.entity.SourceType;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.PreviewColumn;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.PreviewResponse;
import com.corp.iot.backend.externaldb.service.ExternalSourceQueryService;
import com.corp.iot.backend.externalsource.repository.ExternalSourceRepository;
import com.corp.iot.backend.externalsourcejob.dto.CreateExternalSourceJobRequest;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceJobResponse;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceJobRunResponse;
import com.corp.iot.backend.externalsourcejob.dto.ExternalSourceQueryConfig;
import com.corp.iot.backend.externalsourcejob.dto.StartFrom;
import com.corp.iot.backend.externalsourcejob.dto.UpdateExternalSourceJobRequest;
import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJob;
import com.corp.iot.backend.externalsourcejob.mapper.ExternalSourceJobMapper;
import com.corp.iot.backend.externalsourcejob.repository.ExternalSourceJobRepository;
import com.corp.iot.backend.externalsourcejob.repository.ExternalSourceJobRunRepository;
import com.corp.iot.backend.externalsourcejob.util.CronNextRunCalculator;
import com.corp.iot.backend.externalsourcejob.util.SqlQueryValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
public class ExternalSourceJobServiceImpl implements ExternalSourceJobService {

    private final ExternalSourceJobRepository externalSourceJobRepository;
    private final ExternalSourceJobRunRepository externalSourceJobRunRepository;
    private final ExternalSourceRepository externalSourceRepository;
    private final DatastreamRepository datastreamRepository;
    private final ExternalSourceJobMapper externalSourceJobMapper;
    private final ExternalSourceQueryService externalSourceQueryService;
    private final SqlQueryValidator sqlQueryValidator;
    private final CronNextRunCalculator cronNextRunCalculator;

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
        ExternalSourceQueryConfig config = request.queryConfig();
        sqlQueryValidator.validate(config.sql());
        // Backend tự chạy thử thay vì tin FE đã chạy — câu SQL hỏng thì không có cách nào biết
        // trước khi cron chạy, và đó chính là loại lỗi thiết kế này muốn xoá.
        externalSourceQueryService.preview(externalSourceId, config.sql(), config.timestampColumn());

        ExternalSourceJob job = new ExternalSourceJob();
        job.setExternalSourceId(externalSourceId);
        job.setName(request.name());
        job.setQueryConfig(config);
        job.setScheduleCron(request.scheduleCron());
        job.setTotalRowCount(0);
        job.setIncrementalCursor(resolveStartCursor(request).toString());
        job.setNextRunAt(cronNextRunCalculator.nextRunAfter(request.scheduleCron(), Instant.now()));
        externalSourceJobRepository.save(job);
        return externalSourceJobMapper.toResponse(job);
    }

    @Override
    @Transactional
    public ExternalSourceJobResponse update(Long id, UpdateExternalSourceJobRequest request) {
        ExternalSourceJob job = getOrThrow(id);
        job.setName(request.name());

        if (request.queryConfig() != null) {
            ExternalSourceQueryConfig config = request.queryConfig();
            sqlQueryValidator.validate(config.sql());
            PreviewResponse preview = externalSourceQueryService.preview(
                    job.getExternalSourceId(), config.sql(), config.timestampColumn());
            requireBoundColumnsPresent(id, preview.columns());

            boolean timestampColumnChanged = !Objects.equals(
                    config.timestampColumn(), job.getQueryConfig().timestampColumn());
            job.setQueryConfig(config);
            // Chỉ reset cursor khi đổi cột thời gian — mốc cũ đo theo cột khác thì vô nghĩa.
            // Đổi WHERE/SELECT không làm mốc sai, giữ lại để khỏi đọc lại toàn bộ lịch sử.
            if (timestampColumnChanged) {
                job.setIncrementalCursor(Instant.EPOCH.toString());
            }
        }
        if (request.scheduleCron() != null) {
            job.setScheduleCron(request.scheduleCron());
            job.setNextRunAt(cronNextRunCalculator.nextRunAfter(request.scheduleCron(), Instant.now()));
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

    @Override
    @Transactional
    public ExternalSourceJobResponse runNow(Long id) {
        ExternalSourceJob job = getOrThrow(id);
        // Không gọi thẳng x-ingestion-service (3 service chỉ giao tiếp qua Kafka/Redis/Postgres,
        // xem ARCHITECTURE.md) — kéo next_run_at về hiện tại để sweep kế tiếp nhặt lên (≤15s).
        job.setNextRunAt(Instant.now());
        externalSourceJobRepository.save(job);
        return externalSourceJobMapper.toResponse(job);
    }

    @Override
    public List<ExternalSourceJobRunResponse> listRuns(Long id, int sinceHours) {
        getOrThrow(id);
        Instant since = Instant.now().minus(sinceHours, ChronoUnit.HOURS);
        return externalSourceJobRunRepository
                .findByExternalSourceJobIdAndStartedAtAfterOrderByStartedAtDesc(id, since).stream()
                .map(externalSourceJobMapper::toRunResponse)
                .toList();
    }

    // Kênh dữ liệu có id bền, được widget dashboard và luật cảnh báo neo vào. Sửa SQL làm mất cột
    // đang gán là cách âm thầm nhất để giết một widget — chặn tại đây vì lần chạy thử vừa rồi đã
    // trả về đủ danh sách cột, đối chiếu không tốn thêm gì.
    private void requireBoundColumnsPresent(Long jobId, List<PreviewColumn> columns) {
        Set<String> resultColumns = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        columns.forEach(column -> resultColumns.add(column.name()));

        List<String> missing = datastreamRepository
                .findBySourceTypeAndSourceId(SourceType.EXTERNAL_SOURCE_JOB, jobId).stream()
                .map(Datastream::getSourceField)
                .filter(Objects::nonNull)
                .filter(field -> !resultColumns.contains(field))
                .toList();

        if (!missing.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "BOUND_COLUMN_MISSING",
                    "Kết quả truy vấn không còn cột đang gắn kênh dữ liệu: " + String.join(", ", missing));
        }
    }

    private Instant resolveStartCursor(CreateExternalSourceJobRequest request) {
        return switch (request.startFrom()) {
            case NEW_ONLY -> Instant.now();
            case ALL_HISTORY -> Instant.EPOCH;
            case FROM_DATE -> {
                if (request.startFromDate() == null) {
                    throw new BusinessException(HttpStatus.BAD_REQUEST, "START_DATE_REQUIRED",
                            "Chọn \"từ ngày cụ thể\" thì phải có ngày bắt đầu");
                }
                yield request.startFromDate();
            }
        };
    }

    private ExternalSourceJob getOrThrow(Long id) {
        return externalSourceJobRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "JOB_NOT_FOUND", "Không tìm thấy job"));
    }
}
