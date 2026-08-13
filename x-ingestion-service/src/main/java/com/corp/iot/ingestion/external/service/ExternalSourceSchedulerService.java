package com.corp.iot.ingestion.external.service;

import com.corp.iot.ingestion.external.entity.ExternalSource;
import com.corp.iot.ingestion.external.entity.ExternalSourceJob;
import com.corp.iot.ingestion.external.repository.ExternalSourceJobRepository;
import com.corp.iot.ingestion.external.repository.ExternalSourceRepository;
import com.corp.iot.ingestion.external.util.CronNextRunCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

// Fixed-delay sweep quét external_source_job tới hạn (next_run_at <= now) — không cache Redis
// (khác gw-resolve) vì tần suất thấp, theo lịch job chứ không phải mỗi message MQTT (xem
// ARCHITECTURE.md § Flow: External source data).
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalSourceSchedulerService {

    private final ExternalSourceJobRepository externalSourceJobRepository;
    private final ExternalSourceRepository externalSourceRepository;
    private final ExternalQueryExecutorService externalQueryExecutorService;
    private final CronNextRunCalculator cronNextRunCalculator;

    @Scheduled(fixedDelayString = "${app.external.sweep-interval-ms}")
    public void sweep() {
        List<ExternalSourceJob> dueJobs = externalSourceJobRepository.findDueJobs(Instant.now());
        dueJobs.forEach(this::runJob);
    }

    private void runJob(ExternalSourceJob job) {
        ExternalSource source = externalSourceRepository.findById(job.getExternalSourceId()).orElse(null);
        if (source == null || source.getDeletedAt() != null) {
            log.warn("External source not found/deleted for jobId={}, skip", job.getId());
            return;
        }

        ExternalQueryExecutorService.ExecutionResult result = externalQueryExecutorService.execute(job, source);
        Instant now = Instant.now();
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
}
