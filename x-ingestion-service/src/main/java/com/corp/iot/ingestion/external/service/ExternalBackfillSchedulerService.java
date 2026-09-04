package com.corp.iot.ingestion.external.service;

import com.corp.iot.ingestion.external.entity.Datastream;
import com.corp.iot.ingestion.external.entity.ExternalSource;
import com.corp.iot.ingestion.external.entity.ExternalSourceJob;
import com.corp.iot.ingestion.external.entity.ExternalSourceJobBackfill;
import com.corp.iot.ingestion.external.repository.DatastreamRepository;
import com.corp.iot.ingestion.external.repository.ExternalSourceJobBackfillRepository;
import com.corp.iot.ingestion.external.repository.ExternalSourceJobRepository;
import com.corp.iot.ingestion.external.repository.ExternalSourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;

// Sweep RIÊNG, tách khỏi ExternalSourceSchedulerService: một tác vụ vá nặng không được làm trễ
// nhịp cron của job đang chạy. Mỗi lượt chỉ chạy một tác vụ trong một ngân sách thời gian rồi
// nhả, tiến độ nằm trong DB nên lượt sau chạy tiếp đúng chỗ đó.
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalBackfillSchedulerService {

    private final ExternalSourceJobBackfillRepository backfillRepository;
    private final ExternalSourceJobRepository externalSourceJobRepository;
    private final ExternalSourceRepository externalSourceRepository;
    private final DatastreamRepository datastreamRepository;
    private final ExternalBackfillService externalBackfillService;

    @Scheduled(fixedDelayString = "${app.external.backfill-sweep-interval-ms}")
    public void sweep() {
        backfillRepository.findOpenTasks().stream().findFirst().ifPresent(this::runTask);
    }

    private void runTask(ExternalSourceJobBackfill task) {
        ExternalSourceJob job = externalSourceJobRepository.findById(task.getExternalSourceJobId()).orElse(null);
        Datastream datastream = datastreamRepository.findById(task.getDatastreamId()).orElse(null);
        ExternalSource source = job != null
                ? externalSourceRepository.findById(job.getExternalSourceId()).orElse(null)
                : null;

        if (job == null || datastream == null || source == null || source.getDeletedAt() != null) {
            finish(task, "FAILED", "Job, kênh dữ liệu hoặc nguồn đã bị xóa");
            return;
        }

        if (task.getStartedAt() == null) {
            task.setStartedAt(Instant.now());
        }
        task.setStatus("RUNNING");
        backfillRepository.save(task);

        ExternalBackfillService.SliceResult result = externalBackfillService.runSlice(task, job, source, datastream);

        if (result.cursorAt() != null) {
            task.setCursorAt(result.cursorAt());
            task.setRowCount(task.getRowCount() + result.rowCount());
            // Dải dữ liệu của kênh nới sang trái ngay sau mỗi lượt, không đợi tác vụ xong —
            // đó là thứ giữ cho bất biến "liền mạch" đúng kể cả khi service tắt giữa chừng.
            datastream.setOldestReadingAt(result.cursorAt());
            datastreamRepository.save(datastream);
        }

        if (!result.success()) {
            finish(task, "FAILED", result.error());
            return;
        }
        if (result.done()) {
            finish(task, "SUCCESS", null);
            return;
        }
        // Còn dở: giữ RUNNING, lượt sweep sau chạy tiếp từ cursor vừa ghi.
        backfillRepository.save(task);
    }

    private void finish(ExternalSourceJobBackfill task, String status, String error) {
        task.setStatus(status);
        task.setError(error);
        task.setFinishedAt(Instant.now());
        backfillRepository.save(task);
        if ("FAILED".equals(status)) {
            log.warn("Backfill task {} failed: {}", task.getId(), error);
        }
    }
}
