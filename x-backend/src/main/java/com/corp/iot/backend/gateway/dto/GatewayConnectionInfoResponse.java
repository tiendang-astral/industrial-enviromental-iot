package com.corp.iot.backend.gateway.dto;

/** Thông tin điền lên thiết bị. `clientId` = MAC: ACL của EMQX chỉ mở topic mang đúng Client ID. */
public record GatewayConnectionInfoResponse(
        String brokerUrl,
        String clientId,
        String username,
        String password,
        String dataTopic,
        String commandTopic,
        String ackTopic
) {
}
