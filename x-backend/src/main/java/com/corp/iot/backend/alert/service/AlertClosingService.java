package com.corp.iot.backend.alert.service;

import com.corp.iot.backend.alert.entity.Alert;
import com.corp.iot.backend.alert.entity.AlertStatus;
import com.corp.iot.backend.alert.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Set;

/**
 * Đóng alert còn mở của những rule vừa bị tắt hoặc xoá.
 *
 * Đây là NGOẠI LỆ duy nhất cho bất biến "chỉ x-processing-service ghi bảng alert" (DATABASE.md
 * § alert): việc này là hệ quả trực tiếp và đồng bộ của thao tác người dùng vừa làm, không phải suy
 * ra từ một dòng số đo — nên nó thuộc về nơi xử lý thao tác đó. Bất biến kia sinh ra để chặn hai
 * nơi cùng chạy state machine; chuyển sang STALE không phải state machine, nó là điểm kết thúc.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlertClosingService {

    private static final Set<AlertStatus> OPEN = Set.of(AlertStatus.PENDING, AlertStatus.ACTIVE);

    private final AlertRepository alertRepository;

    /** Không gửi thông báo: người vừa tự tay tắt quy tắc không cần nhận mail "sự cố đã hết". */
    public int closeOpenAlerts(Collection<Long> ruleIds) {
        if (ruleIds.isEmpty()) {
            return 0;
        }
        List<Alert> open = alertRepository.findByRuleIdInAndStatusIn(ruleIds, OPEN);
        for (Alert alert : open) {
            alert.setStatus(AlertStatus.STALE);
            alertRepository.save(alert);
        }
        if (!open.isEmpty()) {
            log.info("Đóng {} alert đang mở do quy tắc {} bị tắt/xoá", open.size(), ruleIds);
        }
        return open.size();
    }
}
