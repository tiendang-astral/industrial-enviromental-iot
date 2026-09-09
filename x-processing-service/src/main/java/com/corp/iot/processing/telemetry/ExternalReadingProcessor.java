package com.corp.iot.processing.telemetry;

import com.corp.iot.processing.alert.AlertEvaluationService;
import com.corp.iot.processing.alert.ChannelRef;
import com.corp.iot.processing.dto.ExternalReadingEvent;
import com.corp.iot.processing.entity.Datastream;
import com.corp.iot.processing.entity.Metric;
import com.corp.iot.processing.entity.SourceType;
import com.corp.iot.processing.influx.InfluxWriterService;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.DatastreamRepository;
import com.corp.iot.processing.repository.MetricRepository;
import com.corp.iot.processing.telemetry.TelemetryDedupService.DedupKey;
import com.influxdb.client.write.Point;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Xử lý một LÔ external reading. Song song {@link SensorReadingProcessor} nhưng resolve theo
 * (sourceType=EXTERNAL_SOURCE_JOB, sourceId=externalSourceJobId, sourceField) thay vì pin, và
 * KHÔNG cache: luồng này chạy theo cron, tần suất thấp, không đáng đổi lấy rủi ro cache sai.
 *
 * Vẫn gom lô vì backfill (V13) đọc tới backfill-batch-rows=1000 dòng mỗi lô và chạy liên tiếp
 * trong ngân sách thời gian — đó là lúc topic này dồn dập nhất.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalReadingProcessor {

    private final TelemetryDedupService telemetryDedupService;
    private final DatastreamRepository datastreamRepository;
    private final MetricRepository metricRepository;
    private final InfluxWriterService influxWriterService;
    private final RealtimePublisher realtimePublisher;
    private final AlertEvaluationService alertEvaluationService;

    public void processBatch(List<ExternalReadingEvent> events) {
        // Message vá lịch sử cố ý phát lại messageId đã từng thấy — dedup sẽ chặn oan đúng phần
        // lỗ hổng cần vá (xem ExternalReadingEvent.backfill).
        List<DedupKey> liveKeys = events.stream()
                .filter(e -> !e.backfill())
                .map(e -> new DedupKey(e.tenantId(), e.messageId()))
                .toList();
        Set<String> seen = telemetryDedupService.findDuplicates(liveKeys);

        List<Point> points = new ArrayList<>(events.size());
        List<Prepared> prepared = new ArrayList<>(events.size());

        for (ExternalReadingEvent event : events) {
            if (!event.backfill() && seen.contains(event.messageId())) {
                log.debug("Duplicate messageId={}, skip", event.messageId());
                continue;
            }
            Optional<Datastream> datastream = datastreamRepository.findBySourceTypeAndSourceIdAndSourceField(
                    SourceType.EXTERNAL_SOURCE_JOB, event.externalSourceJobId(), event.sourceField());
            if (datastream.isEmpty()) {
                log.warn("No matching datastream for externalSourceJobId={}, sourceField={}, skip",
                        event.externalSourceJobId(), event.sourceField());
                continue;
            }
            String metricCode = resolveMetricCode(datastream.get().getMetricId());
            if (metricCode == null) {
                log.warn("metric_id={} not found for datastream id={}, skip",
                        datastream.get().getMetricId(), datastream.get().getId());
                continue;
            }

            points.add(influxWriterService.externalPoint(
                    event.tenantId(), event.tenantNodeId(), event.externalSourceJobId(), event.sourceField(),
                    metricCode, event.value(), event.measuredAt()));
            prepared.add(new Prepared(event, datastream.get(), metricCode));
        }

        influxWriterService.writePoints(points);

        realtimePublisher.publishExternalReadings(prepared.stream()
                .map(p -> new RealtimePublisher.ExternalReading(
                        p.event().tenantId(), p.event().tenantNodeId(), p.datastream().getId(),
                        p.metricCode(), p.event().value(), p.event().measuredAt()))
                .toList());

        for (Prepared p : prepared) {
            ExternalReadingEvent event = p.event();
            // Message vá lịch sử mang giá trị của tháng trước — đánh giá ngưỡng trên đó sẽ bắn
            // cảnh báo cho sự cố đã qua từ lâu.
            if (!event.backfill()) {
                alertEvaluationService.evaluate(
                        event.tenantId(), event.tenantNodeId(), ChannelRef.of(p.datastream()), p.metricCode(),
                        event.value(), event.measuredAt());
            }
        }

        telemetryDedupService.markAll(prepared.stream()
                .filter(p -> !p.event().backfill())
                .map(p -> new DedupKey(p.event().tenantId(), p.event().messageId()))
                .toList());
    }

    private String resolveMetricCode(Long metricId) {
        if (metricId == null) {
            return null;
        }
        return metricRepository.findById(metricId).map(Metric::getCode).orElse(null);
    }

    private record Prepared(ExternalReadingEvent event, Datastream datastream, String metricCode) {
    }
}
