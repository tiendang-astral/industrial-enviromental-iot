package com.corp.iot.backend.gateway.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.gateway.dto.GatewayConnectionInfoResponse;
import com.corp.iot.backend.gateway.entity.Gateway;
import com.corp.iot.backend.gateway.mapper.GatewayMapper;
import com.corp.iot.backend.gateway.repository.GatewayRepository;
import com.corp.iot.backend.gatewaypin.service.GatewayPinCacheEvictor;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GatewayServiceImplTest {

    private GatewayRepository gatewayRepository;
    private GatewayServiceImpl service;

    @BeforeEach
    void setUp() {
        gatewayRepository = mock(GatewayRepository.class);
        service = new GatewayServiceImpl(gatewayRepository, mock(TenantNodeRepository.class), new GatewayMapper(),
                mock(ScopeService.class), mock(GatewayPinCacheEvictor.class));
        ReflectionTestUtils.setField(service, "mqttPublicUrl", "tcp://203.0.113.10:31883");
        ReflectionTestUtils.setField(service, "mqttGatewayUsername", "iiot-gateway");
        ReflectionTestUtils.setField(service, "mqttGatewayPassword", "gateway-secret");
    }

    @Test
    void connectionInfoUsesMacAsClientIdAndTopicSegment() {
        Gateway gateway = new Gateway();
        gateway.setId(7L);
        gateway.setMacAddress("AA:BB:CC:DD:EE:FF");
        when(gatewayRepository.findById(7L)).thenReturn(Optional.of(gateway));

        GatewayConnectionInfoResponse info = service.connectionInfo(7L);

        assertThat(info.brokerUrl()).isEqualTo("tcp://203.0.113.10:31883");
        assertThat(info.clientId()).isEqualTo("AA:BB:CC:DD:EE:FF");
        assertThat(info.username()).isEqualTo("iiot-gateway");
        assertThat(info.password()).isEqualTo("gateway-secret");
        assertThat(info.dataTopic()).isEqualTo("gateway/AA:BB:CC:DD:EE:FF/data");
        assertThat(info.commandTopic()).isEqualTo("gateway/AA:BB:CC:DD:EE:FF/command");
        assertThat(info.ackTopic()).isEqualTo("gateway/AA:BB:CC:DD:EE:FF/ack");
    }

    @Test
    void connectionInfoRejectsUnknownGateway() {
        when(gatewayRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.connectionInfo(99L))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("GATEWAY_NOT_FOUND");
    }
}
