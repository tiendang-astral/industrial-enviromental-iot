package com.corp.iot.backend.common.influx;

import com.influxdb.client.InfluxDBClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Xoá số đo trong InfluxDB khi cấu hình sinh ra chúng bị xoá hẳn.
 *
 * Chỉ dùng ở mức JOB trở lên, KHÔNG dùng khi xoá một kênh dữ liệu. Điểm `external_reading` gắn nhãn
 * theo `external_source_job_id` + `source_field` chứ không theo `datastream_id` (xem
 * `InfluxWriterService.externalPoint`) — đó là cố ý, để bỏ gán rồi gán lại kênh không mất lịch sử.
 * Xoá point theo kênh là phá đúng tính chất đó. Còn khi job chết thì id của nó chết theo, không
 * kênh nào đọc tới được dải đó nữa, giữ lại chỉ tốn dung lượng.
 *
 * Bucket không đặt retention (xem `.env.example`), nên không có ai dọn hộ.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InfluxDeleteService {

    private final InfluxDBClient influxDBClient;

    // Tên field cố ý KHÔNG phải `org`/`bucket` như ở InfluxReadService: `@Slf4j` sinh ra logger
    // tham chiếu tới package `org.slf4j`, mà một field tên `org` sẽ che mất chính package đó.
    @Value("${influx.org}")
    private String influxOrg;

    @Value("${influx.bucket}")
    private String influxBucket;

    /**
     * Xoá toàn bộ số đo của một truy vấn định kỳ, mọi cột.
     *
     * Chặn trên lấy dư một ngày: đồng hồ của nguồn ngoài có thể chạy trước máy chủ, và số đo ghi ở
     * tương lai gần mà không xoá thì nó sống sót lại thành dữ liệu ma.
     */
    public void deleteExternalJob(Long tenantId, Long externalSourceJobId) {
        String predicate = """
                _measurement="external_reading" AND tenant_id="%d" AND external_source_job_id="%d"
                """.formatted(tenantId, externalSourceJobId).trim();
        delete(predicate, "job=" + externalSourceJobId);
    }

    private void delete(String predicate, String what) {
        OffsetDateTime start = OffsetDateTime.ofInstant(Instant.EPOCH, ZoneOffset.UTC);
        OffsetDateTime stop = OffsetDateTime.now(ZoneOffset.UTC).plusDays(1);
        try {
            influxDBClient.getDeleteApi().delete(start, stop, predicate, influxBucket, influxOrg);
        } catch (Exception e) {
            // Không ném ra ngoài: cấu hình trong Postgres đã xoá xong và transaction đó phải được
            // giữ. Point sót lại là rác không ai đọc tới, còn rollback ở đây thì người dùng bấm
            // xoá mà không xoá được gì.
            log.error("Xoá số đo InfluxDB thất bại ({}), số đo cũ sẽ nằm lại trong bucket", what, e);
        }
    }
}
