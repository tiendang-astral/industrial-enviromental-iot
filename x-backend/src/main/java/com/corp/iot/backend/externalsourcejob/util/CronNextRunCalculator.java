package com.corp.iot.backend.externalsourcejob.util;

import com.corp.iot.backend.common.exception.BusinessException;
import com.cronutils.model.Cron;
import com.cronutils.model.CronType;
import com.cronutils.model.definition.CronDefinitionBuilder;
import com.cronutils.model.time.ExecutionTime;
import com.cronutils.parser.CronParser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

// Parse cron 5 field chuẩn (cron-utils) — dùng để validate cú pháp lúc tạo/sửa job (x-backend)
// và tính next_run_at ngay khi tạo/sửa để x-ingestion-service sweep nhặt đúng lịch (xem
// ARCHITECTURE.md § Flow: External source data). x-ingestion-service có bản sao riêng dùng
// để tính next_run_at sau mỗi lần chạy job thật.
@Component
public class CronNextRunCalculator {

    private final CronParser parser = new CronParser(CronDefinitionBuilder.instanceDefinitionFor(CronType.UNIX));

    public Instant nextRunAfter(String expression, Instant from) {
        try {
            Cron cron = parser.parse(expression);
            cron.validate();
            return ExecutionTime.forCron(cron)
                    .nextExecution(from.atZone(ZoneOffset.UTC))
                    .map(ZonedDateTime::toInstant)
                    .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CRON", "Không tính được lần chạy tiếp theo"));
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CRON", "schedule_cron không hợp lệ: " + expression);
        }
    }
}
