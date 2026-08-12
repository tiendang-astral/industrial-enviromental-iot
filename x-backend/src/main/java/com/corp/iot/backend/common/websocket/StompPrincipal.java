package com.corp.iot.backend.common.websocket;

import com.corp.iot.backend.common.security.AppUserPrincipal;

import java.security.Principal;

// Wrapper để gắn AppUserPrincipal vào STOMP session (StompHeaderAccessor.setUser
// yêu cầu java.security.Principal, AppUserPrincipal chỉ là record thuần).
public record StompPrincipal(AppUserPrincipal user) implements Principal {

    @Override
    public String getName() {
        return user.username();
    }
}
