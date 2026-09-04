package com.corp.iot.backend.externalsourcejob.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.datastream.entity.Datastream;
import com.corp.iot.backend.datastream.entity.SourceType;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.BackfillEstimateResponse;
import com.corp.iot.backend.externaldb.service.ExternalSourceQueryService;
import com.corp.iot.backend.externalsourcejob.dto.BackfillDtos.BackfillRequest;
import com.corp.iot.backend.externalsourcejob.dto.BackfillDtos.BackfillResponse;
import com.corp.iot.backend.externalsourcejob.dto.StartFrom;
import com.corp.iot.backend.externalsourcejob.entity.BackfillStatus;
import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJob;
import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJobBackfill;
import com.corp.iot.backend.externalsourcejob.repository.ExternalSourceJobBackfillRepository;
import com.corp.iot.backend.externalsourcejob.repository.ExternalSourceJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExternalSourceJobBackfillServiceImpl implements ExternalSourceJobBackfillService {

    private static final List<BackfillStatus> OPEN = List.of(BackfillStatus.PENDING, BackfillStatus.RUNNING);

    private final ExternalSourceJobBackfillRepository backfillRepository;
    private final ExternalSourceJobRepository externalSourceJobRepository;
    private final DatastreamRepository datastreamRepository;
    private final ExternalSourceQueryService externalSourceQueryService;

    @Override
    public BackfillEstimateResponse estimate(Long datastreamId, BackfillRequest request) {
        Datastream datastream = externalDatastream(datastreamId);
        ExternalSourceJob job = jobOf(datastream);
        Instant coveredFrom = coveredFrom(datastream, job);
        Instant targetFrom = resolveTarget(request, coveredFrom);

        return externalSourceQueryService.estimateBackfill(
                job.getExternalSourceId(), job.getQueryConfig(), targetFrom, coveredFrom);
    }

    @Override
    @Transactional
    public BackfillResponse create(Long datastreamId, BackfillRequest request) {
        Datastream datastream = externalDatastream(datastreamId);
        ExternalSourceJob job = jobOf(datastream);
        if (backfillRepository.existsByDatastreamIdAndStatusIn(datastreamId, OPEN)) {
            throw new BusinessException(HttpStatus.CONFLICT, "BACKFILL_IN_PROGRESS",
                    "Kênh này đang có một lượt đọc lại chạy dở");
        }
        Instant coveredFrom = coveredFrom(datastream, job);
        Instant targetFrom = resolveTarget(request, coveredFrom);

        ExternalSourceJobBackfill task = new ExternalSourceJobBackfill();
        task.setExternalSourceJobId(job.getId());
        task.setDatastreamId(datastreamId);
        task.setTargetFrom(targetFrom);
        task.setCoveredFrom(coveredFrom);
        // Bắt đầu ở cận trên rồi lùi dần — mốc này chính là chỗ dải dữ liệu hiện tại kết thúc.
        task.setCursorAt(coveredFrom);
        task.setStatus(BackfillStatus.PENDING);
        task.setCreatedBy(currentUserId());
        backfillRepository.save(task);

        return toResponse(task);
    }

    @Override
    public BackfillResponse latest(Long datastreamId) {
        externalDatastream(datastreamId);
        return backfillRepository.findFirstByDatastreamIdOrderByCreatedAtDesc(datastreamId)
                .map(this::toResponse)
                .orElse(null);
    }

    // Cận trên của dải cần vá = chỗ dữ liệu liền mạch hiện tại bắt đầu. Kênh chưa có mốc (tạo
    // trước V13) thì lấy mốc đọc của job — đó đúng là nơi dữ liệu của kênh khởi đầu.
    private Instant coveredFrom(Datastream datastream, ExternalSourceJob job) {
        if (datastream.getOldestReadingAt() != null) {
            return datastream.getOldestReadingAt();
        }
        return parseCursor(job.getIncrementalCursor());
    }

    private Instant resolveTarget(BackfillRequest request, Instant coveredFrom) {
        Instant target = switch (request.startFrom()) {
            case ALL_HISTORY -> Instant.EPOCH;
            case FROM_DATE -> {
                if (request.startFromDate() == null) {
                    throw new BusinessException(HttpStatus.BAD_REQUEST, "START_DATE_REQUIRED",
                            "Chọn \"từ ngày cụ thể\" thì phải có ngày bắt đầu");
                }
                yield request.startFromDate();
            }
            case NEW_ONLY -> throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_START_FROM",
                    "\"Chỉ dữ liệu mới\" không có gì để đọc lại");
        };
        if (!target.isBefore(coveredFrom)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "NOTHING_TO_BACKFILL",
                    "Kênh đã có dữ liệu từ mốc này trở đi");
        }
        return target;
    }

    private Datastream externalDatastream(Long id) {
        Datastream datastream = datastreamRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "DATASTREAM_NOT_FOUND",
                        "Không tìm thấy kênh dữ liệu"));
        if (datastream.getSourceType() != SourceType.EXTERNAL_SOURCE_JOB) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "BACKFILL_NOT_SUPPORTED",
                    "Chỉ kênh từ nguồn dữ liệu ngoài mới đọc lại được lịch sử");
        }
        return datastream;
    }

    private ExternalSourceJob jobOf(Datastream datastream) {
        return externalSourceJobRepository.findById(datastream.getSourceId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "JOB_NOT_FOUND", "Không tìm thấy job"));
    }

    private Instant parseCursor(String cursor) {
        try {
            return cursor != null && !cursor.isBlank() ? Instant.parse(cursor) : Instant.now();
        } catch (Exception e) {
            return Instant.now();
        }
    }

    private BackfillResponse toResponse(ExternalSourceJobBackfill task) {
        return new BackfillResponse(
                task.getId(),
                task.getDatastreamId(),
                task.getTargetFrom(),
                task.getCoveredFrom(),
                task.getCursorAt(),
                task.getStatus().name(),
                task.getRowCount(),
                task.getError(),
                task.getStartedAt(),
                task.getFinishedAt(),
                progressPercent(task)
        );
    }

    private Integer progressPercent(ExternalSourceJobBackfill task) {
        if (task.getStatus() == BackfillStatus.SUCCESS) {
            return 100;
        }
        long span = Duration.between(task.getTargetFrom(), task.getCoveredFrom()).toSeconds();
        if (span <= 0) {
            return null;
        }
        long done = Duration.between(task.getCursorAt(), task.getCoveredFrom()).toSeconds();
        return (int) Math.max(0, Math.min(100, done * 100 / span));
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AppUserPrincipal principal) {
            return principal.userId();
        }
        return null;
    }
}
