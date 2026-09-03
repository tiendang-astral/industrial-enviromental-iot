package com.corp.iot.ingestion.external.service;

import com.corp.iot.ingestion.external.entity.ExternalSource;
import com.corp.iot.ingestion.external.entity.ExternalSourceJob;
import com.corp.iot.ingestion.external.entity.ExternalSourceJobRun;
import com.corp.iot.ingestion.external.repository.ExternalSourceJobRepository;
import com.corp.iot.ingestion.external.repository.ExternalSourceJobRunRepository;
import com.corp.iot.ingestion.external.repository.ExternalSourceRepository;
import com.corp.iot.ingestion.external.util.CronNextRunCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

// Fixed-delay sweep quét external_source_job tới hạn (next_run_at <= now) — không cache Redis
// (khác gw-resolve) vì tần suất thấp, theo lịch job chứ không phải mỗi message MQTT (xem
// ARCHITECTURE.md § Flow: External source data).
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalSourceSchedulerService {

    private final ExternalSourceJobRepository externalSourceJobRepository;
    private final ExternalSourceJobRunRepository externalSourceJobRunRepository;
    private final ExternalSourceRepository externalSourceRepository;
    private final ExternalQueryExecutorService externalQueryExecutorService;
    private final CronNextRunCalculator cronNextRunCalculator;

    @Scheduled(fixedDelayString = "${app.external.sweep-interval-ms}")
    public void sweep() {
        List<ExternalSourceJob> dueJobs = externalSourceJobRepository.findDueJobs(Instant.now());
        dueJobs.forEach(this::runJob);
    }

    // Bảng log chạy mỗi phút/job nên phải tự dọn — trang chi tiết chỉ đọc 12 giờ gần nhất,
    // giữ 7 ngày là đủ rộng cho việc lần lại sự cố.
    @Scheduled(fixedDelayString = "${app.external.run-history-cleanup-interval-ms}")
    @Transactional
    public void cleanupRunHistory() {
        int deleted = externalSourceJobRunRepository.deleteOlderThan(Instant.now().minus(7, ChronoUnit.DAYS));
        if (deleted > 0) {
            log.info("Cleaned up {} external_source_job_run rows", deleted);
        }
    }

    private void runJob(ExternalSourceJob job) {
        ExternalSource source = externalSourceRepository.findById(job.getExternalSourceId()).orElse(null);
        if (source == null || source.getDeletedAt() != null) {
            log.warn("External source not found/deleted for jobId={}, skip", job.getId());
            return;
        }

        Instant startedAt = Instant.now();
        ExternalQueryExecutorService.ExecutionResult result = externalQueryExecutorService.execute(job, source);
        Instant now = Instant.now();
        saveRun(job, result, startedAt, now);
        if (result.success()) {
            job.setLastRunStatus("SUCCESS");
            job.setLastError(null);
            job.setTotalRowCount(job.getTotalRowCount() + result.rowCount());
            if (result.maxMeasuredAt() != null) {
                job.setIncrementalCursor(result.maxMeasuredAt().toString());
            }
        } else {
            job.setLastRunStatus("FAILED");
            job.setLastError(result.error());
        }
        job.setLastRunAt(now);
        // Vẫn advance next_run_at kể cả lỗi — tránh retry-storm (log + skip, không throw,
        // xem CONVENTIONS.md § Error handling).
        job.setNextRunAt(cronNextRunCalculator.nextRunAfter(job.getScheduleCron(), now).orElse(now.plusSeconds(3600)));
        externalSourceJobRepository.save(job);

        // Rollup lên source (1 source có thể nhiều job) — last-write-wins, source phản ánh
        // trạng thái của LẦN CHẠY GẦN NHẤT trong số các job con, không phải "tất cả job đều OK".
        source.setLastSyncStatus(job.getLastRunStatus());
        source.setLastSyncAt(now);
        source.setLastError(job.getLastError());
        externalSourceRepository.save(source);
    }

    private void saveRun(ExternalSourceJob job, ExternalQueryExecutorService.ExecutionResult result,
                         Instant startedAt, Instant finishedAt) {
        ExternalSourceJobRun run = new ExternalSourceJobRun();
        run.setTenantId(job.getTenantId());
        run.setExternalSourceJobId(job.getId());
        run.setStatus(result.success() ? "SUCCESS" : "FAILED");
        run.setRowCount(result.rowCount());
        run.setError(result.error());
        run.setStartedAt(startedAt);
        run.setFinishedAt(finishedAt);
        externalSourceJobRunRepository.save(run);
    }
}
