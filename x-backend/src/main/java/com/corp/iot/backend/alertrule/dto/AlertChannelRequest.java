package com.corp.iot.backend.alertrule.dto;

import com.corp.iot.backend.alertrule.entity.ChannelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AlertChannelRequest(
        @NotNull ChannelType channelType,
        String name,
        @NotBlank String address,
        String telegramBotToken
) {
}
