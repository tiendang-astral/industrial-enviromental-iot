package com.corp.iot.backend.common.websocket;

import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.common.security.JwtService;
import com.corp.iot.backend.common.security.UserType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StompAuthChannelInterceptorTest {

    private static final AppUserPrincipal PRINCIPAL =
            new AppUserPrincipal(1L, 12L, "operator1", UserType.TENANT, List.of("OPERATOR"));

    private JwtService jwtService;
    private ScopeService scopeService;
    private StompAuthChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        jwtService = mock(JwtService.class);
        scopeService = mock(ScopeService.class);
        interceptor = new StompAuthChannelInterceptor(jwtService, scopeService);
    }

    @Test
    void connectWithValidTokenSetsPrincipal() {
        when(jwtService.parse("good-token")).thenReturn(Optional.of(PRINCIPAL));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.addNativeHeader("Authorization", "Bearer good-token");
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        interceptor.preSend(message, null);

        assertThat(accessor.getUser()).isInstanceOf(StompPrincipal.class);
        assertThat(((StompPrincipal) accessor.getUser()).user()).isEqualTo(PRINCIPAL);
    }

    @Test
    void connectWithoutAuthorizationHeaderThrows() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
    }

    @Test
    void connectWithInvalidTokenThrows() {
        when(jwtService.parse("bad-token")).thenReturn(Optional.empty());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.addNativeHeader("Authorization", "Bearer bad-token");
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
    }

    @Test
    void subscribeToOwnTenantAndAccessibleNodeSucceeds() {
        when(scopeService.canAccessNode(12L, 1L, 56L)).thenReturn(true);

        StompHeaderAccessor accessor = subscribeAccessor("/topic/realtime/12/56", PRINCIPAL);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        interceptor.preSend(message, null); // không throw = pass
    }

    @Test
    void subscribeToDifferentTenantThrows() {
        StompHeaderAccessor accessor = subscribeAccessor("/topic/realtime/999/56", PRINCIPAL);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
    }

    @Test
    void subscribeOutOfScopeNodeThrows() {
        when(scopeService.canAccessNode(12L, 1L, 56L)).thenReturn(false);

        StompHeaderAccessor accessor = subscribeAccessor("/topic/realtime/12/56", PRINCIPAL);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
    }

    @Test
    void subscribeWithoutPriorConnectThrows() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/realtime/12/56");
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
    }

    @Test
    void subscribeToUnrelatedDestinationThrows() {
        StompHeaderAccessor accessor = subscribeAccessor("/topic/something-else", PRINCIPAL);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
    }

    private StompHeaderAccessor subscribeAccessor(String destination, AppUserPrincipal principal) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        accessor.setUser(new StompPrincipal(principal));
        return accessor;
    }
}
