package com.corp.iot.backend.telemetry.service;

import com.corp.iot.backend.telemetry.dto.DatastreamTelemetryResponse;
import com.corp.iot.backend.telemetry.dto.PinTelemetryResponse;

import java.util.List;

public interface TelemetryService {

    List<PinTelemetryResponse> getGatewayTelemetry(Long gatewayId, int rangeMinutes);

    /** Mọi kênh của 1 external_source (join qua job) kèm lịch sử — cho trang tổng quan nguồn. */
    List<DatastreamTelemetryResponse> getExternalSourceTelemetry(Long externalSourceId, int rangeMinutes);

    /**
     * Lịch sử của ĐÚNG một kênh, không cần biết phía sau là chân gateway hay câu SQL. Widget biểu đồ
     * trên dashboard chỉ cầm `datastreamId`: kênh external nằm trên board đơn vị không tra ngược ra
     * được `external_source_id` (`datastream.source_id` là id của *job*), nên hai endpoint theo
     * gateway/theo nguồn không phục vụ được nó.
     */
    /**
     * `includeHistory=false` bỏ HẲN truy vấn lịch sử (không phải tải rồi vứt): ô số chỉ cần một con
     * số, mà mỗi lần đọc lịch sử là tối đa 500 điểm/kênh — board mười ô giá trị làm mới mỗi phút thì
     * đó là vài trăm KB cho mười con số.
     */
    DatastreamTelemetryResponse getDatastreamTelemetry(Long datastreamId, int rangeMinutes, boolean includeHistory);
}
