package com.corp.iot.backend.alertrule.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.TenantId;

import java.time.Instant;

/**
 * Kênh nhận cảnh báo thuộc HẲN về một rule — không tái dùng chéo rule, sửa rule là replace
 * toàn bộ (xem DATABASE.md § alert_channel).
 */
@Entity
@Table(name = "alert_channel")
@Getter
@Setter
@NoArgsConstructor
public class AlertChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "alert_rule_id", nullable = false)
    private Long alertRuleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type", nullable = false)
    private ChannelType channelType;

    private String name;

    @Column(nullable = false)
    private String address;

    @Column(name = "telegram_bot_token")
    private String telegramBotToken;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
