package com.corp.iot.backend.common.websocket;

import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.common.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Auth cho STOMP: CONNECT validate JWT (JwtService, tái dùng từ HTTP filter) và gắn
// Principal vào session; SUBSCRIBE chặn nếu tenantId trong destination không khớp
// JWT hoặc ngoài scope user (ScopeService — cùng cơ chế phân quyền theo tenant_node
// đã dùng ở @nodeScope cho REST). Xem contract ở ARCHITECTURE.md § Flow: Gateway sensor data.
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern REALTIME_TOPIC = Pattern.compile("^/topic/realtime/(\\d+)/(\\d+)$");

    private final JwtService jwtService;
    private final ScopeService scopeService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        if (accessor.getCommand() == StompCommand.CONNECT) {
            handleConnect(accessor);
        } else if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
            handleSubscribe(accessor);
        }
        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new MessagingException("Thiếu Authorization header");
        }
        AppUserPrincipal principal = jwtService.parse(authHeader.substring("Bearer ".length()))
                .orElseThrow(() -> new MessagingException("Token không hợp lệ"));
        accessor.setUser(new StompPrincipal(principal));
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        Matcher matcher = REALTIME_TOPIC.matcher(destination == null ? "" : destination);
        if (!matcher.matches()) {
            throw new MessagingException("Destination không hợp lệ");
        }
        Long tenantId = Long.valueOf(matcher.group(1));
        Long tenantNodeId = Long.valueOf(matcher.group(2));

        if (!(accessor.getUser() instanceof StompPrincipal stompPrincipal)) {
            throw new MessagingException("Chưa xác thực");
        }
        AppUserPrincipal user = stompPrincipal.user();
        boolean authorized = tenantId.equals(user.tenantId())
                && scopeService.canAccessNode(user.tenantId(), user.userId(), tenantNodeId);
        if (!authorized) {
            throw new MessagingException("Không có quyền subscribe topic này");
        }
    }
}
