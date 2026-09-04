package com.corp.iot.processing.telemetry;

import com.corp.iot.processing.dto.ExternalReadingEvent;
import com.corp.iot.processing.entity.Datastream;
import com.corp.iot.processing.entity.Metric;
import com.corp.iot.processing.entity.SourceType;
import com.corp.iot.processing.influx.InfluxWriterService;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.repository.DatastreamRepository;
import com.corp.iot.processing.repository.MetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

// Orchestrate 1 external reading event: dedup -> resolve datastream/metric -> ghi InfluxDB
// -> publish realtime (xem ARCHITECTURE.md § Flow: External source data, bước 6-9 phần
// Processing Service). Song song SensorReadingProcessor nhưng resolve theo
// (sourceType=EXTERNAL_SOURCE_JOB, sourceId=externalSourceJobId, sourceField) thay vì pin.
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalReadingProcessor {

    private final TelemetryDedupService telemetryDedupService;
    private final DatastreamRepository datastreamRepository;
    private final MetricRepository metricRepository;
    private final InfluxWriterService influxWriterService;
    private final RealtimePublisher realtimePublisher;

    public void process(ExternalReadingEvent event) {
        // Message vá lịch sử cố ý phát lại messageId đã từng thấy — dedup sẽ chặn oan đúng
        // phần lỗ hổng cần vá (xem ExternalReadingEvent.backfill).
        if (!event.backfill() && !telemetryDedupService.markIfNew(event.tenantId(), event.messageId())) {
            log.debug("Duplicate messageId={}, skip", event.messageId());
            return;
        }

        Optional<Datastream> datastream = datastreamRepository.findBySourceTypeAndSourceIdAndSourceField(
                SourceType.EXTERNAL_SOURCE_JOB, event.externalSourceJobId(), event.sourceField());
        if (datastream.isEmpty()) {
            log.warn("No matching datastream for externalSourceJobId={}, sourceField={}, skip",
                    event.externalSourceJobId(), event.sourceField());
            return;
        }

        String metricCode = resolveMetricCode(datastream.get().getMetricId());
        if (metricCode == null) {
            log.warn("metric_id={} not found for datastream id={}, skip", datastream.get().getMetricId(), datastream.get().getId());
            return;
        }

        influxWriterService.writeExternalReading(
                event.tenantId(), event.tenantNodeId(), event.externalSourceJobId(), event.sourceField(),
                metricCode, event.value(), event.measuredAt());
        realtimePublisher.publishExternalReading(
                event.tenantId(), event.tenantNodeId(), datastream.get().getId(), metricCode, event.value(), event.measuredAt());
    }

    private String resolveMetricCode(Long metricId) {
        if (metricId == null) {
            return null;
        }
        return metricRepository.findById(metricId).map(Metric::getCode).orElse(null);
    }
}
