package com.corp.iot.backend.report.service;

import com.corp.iot.backend.report.dto.ReportDtos.EnvironmentReportResponse;
import com.corp.iot.backend.report.dto.ReportDtos.IncidentReportResponse;

import java.time.Instant;
import java.util.List;

/**
 * Báo cáo chạy ĐỒNG BỘ (Phase 8): người dùng xem kết quả ngay trên màn hình rồi tự in ra PDF bằng
 * trình duyệt, nên không có bảng hàng đợi, không worker, không MinIO.
 */
public interface ReportService {

    /**
     * Mọi danh sách lọc rỗng = không lọc chiều đó (toàn bộ trong phạm vi user). `gatewayIds` và
     * `externalSourceIds` hợp nhau chứ không giao: chọn cả hai nghĩa là "kênh của những gateway này
     * HOẶC của những nguồn này", vì một kênh không thể vừa thuộc gateway vừa thuộc nguồn ngoài.
     */
    EnvironmentReportResponse environment(Instant from, Instant to, List<Long> tenantNodeIds,
                                          List<Long> metricIds, List<Long> gatewayIds, List<Long> externalSourceIds);

    IncidentReportResponse incident(Instant from, Instant to, List<Long> tenantNodeIds, String severity,
                                    List<Long> gatewayIds, List<Long> externalSourceIds, List<Long> metricIds);
}
