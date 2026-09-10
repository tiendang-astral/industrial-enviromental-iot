package com.corp.iot.processing.alert;

import com.corp.iot.processing.entity.Datastream;
import com.corp.iot.processing.entity.SourceType;

/**
 * Những field alert engine thực sự cần từ một kênh dữ liệu.
 *
 * Trước đây {@link AlertEvaluationService} nhận thẳng entity {@code Datastream}, nên luồng gateway
 * buộc phải query Postgres lấy entity đó cho MỖI số đo dù chỉ dùng vài field bất biến. Tách ra
 * record để {@code PinResolverService} nhét thẳng vào cache Redis.
 *
 * @param ownerId thiết bị/nguồn mà kênh này thuộc về — {@code gateway.id} với kênh gateway,
 *                {@code external_source.id} với kênh từ database ngoài. Đây là thứ quy tắc đối
 *                chiếu khi người dùng chọn phạm vi đích danh (`V24`). NULL = không xác định được,
 *                khi đó quy tắc CÓ giới hạn phạm vi sẽ bỏ qua kênh này.
 */
public record ChannelRef(Long id, String name, Long metricId, SourceType sourceType, Long ownerId) {

    /**
     * Kênh từ database ngoài. {@code datastream.sourceId} là id của TRUY VẤN ĐỊNH KỲ chứ không phải
     * của nguồn, nên nguồn phải được tra sẵn và truyền vào — xem {@code ExternalReadingProcessor}.
     */
    public static ChannelRef of(Datastream datastream, Long externalSourceId) {
        return new ChannelRef(
                datastream.getId(), datastream.getName(), datastream.getMetricId(),
                datastream.getSourceType(), externalSourceId);
    }
}
