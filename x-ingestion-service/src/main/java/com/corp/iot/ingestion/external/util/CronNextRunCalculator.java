package com.corp.iot.ingestion.external.util;

import com.cronutils.model.Cron;
import com.cronutils.model.CronType;
import com.cronutils.model.definition.CronDefinitionBuilder;
import com.cronutils.model.time.ExecutionTime;
import com.cronutils.parser.CronParser;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Optional;

// Tính next_run_at sau mỗi lần chạy job — bản sao riêng của x-ingestion-service (x-backend
// có bản tương tự dùng để validate cú pháp + tính next_run_at lúc tạo/sửa job).
@Component
public class CronNextRunCalculator {

    private final CronParser parser = new CronParser(CronDefinitionBuilder.instanceDefinitionFor(CronType.UNIX));

    public Optional<Instant> nextRunAfter(String expression, Instant from) {
        try {
            Cron cron = parser.parse(expression);
            return ExecutionTime.forCron(cron)
                    .nextExecution(from.atZone(ZoneOffset.UTC))
                    .map(ZonedDateTime::toInstant);
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
