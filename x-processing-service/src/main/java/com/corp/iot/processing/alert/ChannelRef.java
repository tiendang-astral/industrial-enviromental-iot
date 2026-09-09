package com.corp.iot.processing.alert;

import com.corp.iot.processing.entity.Datastream;
import com.corp.iot.processing.entity.SourceType;

/**
 * Bốn field alert engine thực sự cần từ một kênh dữ liệu.
 *
 * Trước đây {@link AlertEvaluationService} nhận thẳng entity {@code Datastream}, nên luồng gateway
 * buộc phải query Postgres lấy entity đó cho MỖI số đo dù chỉ dùng 4 field bất biến. Tách ra record
 * để {@code PinResolverService} nhét thẳng vào cache Redis.
 */
public record ChannelRef(Long id, String name, Long metricId, SourceType sourceType) {

    public static ChannelRef of(Datastream datastream) {
        return new ChannelRef(
                datastream.getId(), datastream.getName(), datastream.getMetricId(), datastream.getSourceType());
    }
}
