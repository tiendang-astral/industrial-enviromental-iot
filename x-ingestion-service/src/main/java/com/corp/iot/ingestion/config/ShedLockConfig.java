package com.corp.iot.ingestion.config;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

// Khoá phân tán cho @Scheduled (bảng shedlock, V20). Không có nó thì chạy 2 instance nghĩa là
// 2 câu SQL cùng bắn vào database khách và incremental_cursor đè nhau — xem V20__shedlock.sql.
@Configuration
@EnableSchedulerLock(defaultLockAtMostFor = "PT5M")
public class ShedLockConfig {

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
                JdbcTemplateLockProvider.Configuration.builder()
                        .withJdbcTemplate(new JdbcTemplate(dataSource))
                        // Mốc thời gian lấy từ Postgres, không lấy từ đồng hồ máy chạy service —
                        // lệch giờ giữa các máy sẽ làm khoá hết hạn sớm và hai bản cùng chạy.
                        .usingDbTime()
                        .build());
    }
}
