package com.corp.iot.processing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Chỉ đọc — người nhận cảnh báo của 1 rule (EMAIL/TELEGRAM).
@Entity
@Table(name = "alert_channel")
@Getter
@Setter
@NoArgsConstructor
public class AlertChannel {

    @Id
    private Long id;

    @Column(name = "alert_rule_id", nullable = false)
    private Long alertRuleId;

    @Column(name = "channel_type", nullable = false)
    private String channelType;

    private String name;

    @Column(nullable = false)
    private String address;

    @Column(name = "telegram_bot_token")
    private String telegramBotToken;
}
