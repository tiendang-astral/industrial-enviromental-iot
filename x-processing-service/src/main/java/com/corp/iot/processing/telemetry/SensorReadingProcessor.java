package com.corp.iot.processing.telemetry;

import com.corp.iot.processing.alert.AlertEvaluationService;
import com.corp.iot.processing.alert.AlertRuleResolver.ResolvedRule;
import com.corp.iot.processing.alert.AlertRuleResolver.RuleKey;
import com.corp.iot.processing.dto.SensorReadingEvent;
import com.corp.iot.processing.influx.InfluxWriterService;
import com.corp.iot.processing.realtime.RealtimePublisher;
import com.corp.iot.processing.telemetry.PinResolverService.PinKey;
import com.corp.iot.processing.telemetry.TelemetryDedupService.DedupKey;
import com.influxdb.client.write.Point;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Xử lý một LÔ sensor reading. Mọi bước chạm Redis đều gộp thành ĐÚNG MỘT round-trip cho cả lô:
 * lọc trùng (MGET) -> tra pin/metric/kênh (MGET) -> ghi InfluxDB (1 writePoints) -> chạm
 * last_seen_at (đã tiết chế) -> tra rule cảnh báo (MGET) -> publish realtime (pipeline) ->
 * đánh giá cảnh báo -> đánh dấu dedup (pipeline).
 *
 * Chỉ các bước TRA/GỬI được gộp. Lọc source_type, so ngưỡng và state machine vẫn chạy riêng cho
 * từng số đo, TUẦN TỰ theo thứ tự lô — AlertStateMachineService dựa trên chuỗi giá trị liên tiếp
 * của từng kênh nên xáo thứ tự là sai.
 *
 * Lỗi DỮ LIỆU (không tìm thấy pin, pin tắt) -> log + bỏ riêng số đo đó. Lỗi HẠ TẦNG -> ném ra để
 * container retry cả lô; dedup chỉ đánh dấu ở bước cuối nên retry không bị chặn oan.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SensorReadingProcessor {

    private final TelemetryDedupService telemetryDedupService;
    private final PinResolverService pinResolverService;
    private final InfluxWriterService influxWriterService;
    private final GatewayLastSeenService gatewayLastSeenService;
    private final RealtimePublisher realtimePublisher;
    private final AlertEvaluationService alertEvaluationService;

    public void processBatch(List<SensorReadingEvent> events) {
        Set<String> seen = telemetryDedupService.findDuplicates(events.stream()
                .map(e -> new DedupKey(e.tenantId(), e.messageId()))
                .toList());

        List<SensorReadingEvent> fresh = events.stream()
                .filter(e -> !seen.contains(e.messageId()))
                .toList();
        if (fresh.size() < events.size()) {
            log.debug("Bỏ {} message trùng trong lô {}", events.size() - fresh.size(), events.size());
        }

        Map<PinKey, ResolvedPin> pins = pinResolverService.resolveAll(fresh.stream()
                .map(e -> new PinKey(e.gatewayId(), e.pinType(), e.pinNumber()))
                .toList());

        List<Point> points = new ArrayList<>(fresh.size());
        List<Prepared> prepared = new ArrayList<>(fresh.size());
        List<DedupKey> toMark = new ArrayList<>(fresh.size());

        for (SensorReadingEvent event : fresh) {
            ResolvedPin pin = pins.get(new PinKey(event.gatewayId(), event.pinType(), event.pinNumber()));
            if (pin == null) {
                log.warn("No matching gateway_pin/metric for gatewayId={}, type={}, pinNumber={}, skip",
                        event.gatewayId(), event.pinType(), event.pinNumber());
                continue;
            }
            if (!pin.enabled()) {
                log.debug("Pin disabled (gatewayId={}, type={}, pinNumber={}), skip",
                        event.gatewayId(), event.pinType(), event.pinNumber());
                continue;
            }

            points.add(influxWriterService.sensorPoint(
                    event.tenantId(), event.tenantNodeId(), event.gatewayId(), pin.metricCode(),
                    event.pinType(), event.pinNumber(), event.value(), event.measuredAt()));
            prepared.add(new Prepared(event, pin));
            toMark.add(new DedupKey(event.tenantId(), event.messageId()));
        }

        // Ném ra ngoài nếu lỗi: cả lô chưa được đánh dấu dedup nên retry lấy lại đủ, và ghi lại
        // cùng tag + timestamp là idempotent nên không sinh điểm trùng.
        influxWriterService.writePoints(points);

        touchGateways(prepared);
        publishRealtime(prepared);
        try {
            evaluateAlerts(prepared);
        } catch (Exception e) {
            // Cảnh báo là best-effort; số đo đã ghi InfluxDB xong rồi. Để lọt lên trên thì cả lô
            // bị retry vô hạn chỉ vì alert engine hỏng — sai nguyên tắc "không làm hỏng luồng ghi".
            log.error("Đánh giá cảnh báo cho lô {} số đo thất bại, bỏ qua", prepared.size(), e);
        }

        telemetryDedupService.markAll(toMark);
    }

    private void touchGateways(List<Prepared> prepared) {
        Set<Long> gatewayIds = new HashSet<>();
        for (Prepared p : prepared) {
            gatewayIds.add(p.event().gatewayId());
        }
        gatewayIds.forEach(gatewayLastSeenService::touch);
    }

    // Cả lô đi trong 1 round-trip. Subscriber vẫn nhận N message riêng, đúng thứ tự.
    private void publishRealtime(List<Prepared> prepared) {
        realtimePublisher.publishSensorReadings(prepared.stream()
                .map(p -> new RealtimePublisher.SensorReading(
                        p.event().tenantId(), p.event().tenantNodeId(), p.event().gatewayId(), p.pin().metricCode(),
                        p.event().pinType(), p.event().pinNumber(), p.event().value(), p.event().measuredAt()))
                .toList());
    }

    private void evaluateAlerts(List<Prepared> prepared) {
        List<Prepared> withChannel = prepared.stream().filter(p -> p.pin().hasChannel()).toList();
        if (withChannel.isEmpty()) {
            return;
        }
        Map<RuleKey, List<ResolvedRule>> rules = alertEvaluationService.prefetchRules(
                withChannel.stream().map(SensorReadingProcessor::ruleKey).toList());

        // Tuần tự, giữ nguyên thứ tự lô.
        for (Prepared p : withChannel) {
            alertEvaluationService.evaluateWith(
                    // gatewayId lấy thẳng từ message, không phải tra gì: nó đã là khoá của chính
                    // lượt resolve pin ở trên (và là tag `gateway_id` trong InfluxDB).
                    p.event().tenantId(), p.event().tenantNodeId(),
                    p.pin().toChannelRef(p.event().gatewayId()), p.pin().metricCode(),
                    p.event().value(), p.event().measuredAt(), rules.get(ruleKey(p)));
        }
    }

    private static RuleKey ruleKey(Prepared p) {
        return new RuleKey(p.event().tenantId(), p.event().tenantNodeId(), p.pin().metricId(), p.pin().metricCode());
    }

    private record Prepared(SensorReadingEvent event, ResolvedPin pin) {
    }
}
