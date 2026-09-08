package com.corp.iot.backend.externalsourcejob.repository;

import com.corp.iot.backend.externalsourcejob.entity.ExternalSourceJobRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface ExternalSourceJobRunRepository extends JpaRepository<ExternalSourceJobRun, Long> {

    List<ExternalSourceJobRun> findByExternalSourceJobIdAndStartedAtAfterOrderByStartedAtDesc(
            Long externalSourceJobId, Instant startedAt);

    // Trang nguồn vẽ dải nhịp chạy cho MỌI job cùng lúc; gọi query đơn theo từng job sẽ thành
    // N request cho một màn hình.
    List<ExternalSourceJobRun> findByExternalSourceJobIdInAndStartedAtAfterOrderByStartedAtDesc(
            Collection<Long> externalSourceJobIds, Instant startedAt);
}
