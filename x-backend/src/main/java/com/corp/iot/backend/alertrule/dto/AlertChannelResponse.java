package com.corp.iot.backend.alertrule.dto;

/** Không trả {@code telegramBotToken} — token là bí mật, giống credential của external_source. */
public record AlertChannelResponse(Long id, String channelType, String name, String address, boolean hasBotToken) {
}
