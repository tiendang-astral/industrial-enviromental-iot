package com.corp.iot.backend.gateway.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.gateway.dto.CreateGatewayRequest;
import com.corp.iot.backend.gateway.dto.GatewayResponse;
import com.corp.iot.backend.gateway.dto.UpdateGatewayRequest;
import com.corp.iot.backend.gateway.entity.Gateway;
import com.corp.iot.backend.gateway.mapper.GatewayMapper;
import com.corp.iot.backend.gateway.repository.GatewayRepository;
import com.corp.iot.backend.tenantnode.entity.NodeType;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class GatewayServiceImpl implements GatewayService {

    private final GatewayRepository gatewayRepository;
    private final TenantNodeRepository tenantNodeRepository;
    private final GatewayMapper gatewayMapper;
    private final ScopeService scopeService;

    @Override
    public List<GatewayResponse> list(Long tenantNodeId) {
        if (tenantNodeId != null) {
            return gatewayRepository.findByTenantNodeId(tenantNodeId).stream()
                    .map(gatewayMapper::toResponse)
                    .toList();
        }
        // Không truyền tenantNodeId = danh sách toàn bộ thiết bị trong scope user
        // (trang "Thiết bị") — lọc theo node cho phép thay vì theo 1 node cụ thể.
        AppUserPrincipal principal = (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Set<Long> accessible = scopeService.resolveAccessibleNodeIds(principal.tenantId(), principal.userId());
        return gatewayRepository.findAll().stream()
                .filter(gateway -> accessible == null || accessible.contains(gateway.getTenantNodeId()))
                .map(gatewayMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public GatewayResponse create(CreateGatewayRequest request) {
        TenantNode node = tenantNodeRepository.findById(request.tenantNodeId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NODE_NOT_FOUND", "Không tìm thấy node"));
        if (node.getNodeType() != NodeType.SITE) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_GATEWAY_NODE", "Gateway chỉ có thể gán vào node kiểu SITE");
        }
        if (gatewayRepository.macAddressExistsPlatformWide(request.macAddress())) {
            throw new BusinessException(HttpStatus.CONFLICT, "MAC_ADDRESS_TAKEN", "MAC address đã được sử dụng");
        }

        Gateway gateway = new Gateway();
        gateway.setTenantNodeId(node.getId());
        gateway.setName(request.name());
        gateway.setMacAddress(request.macAddress());
        gatewayRepository.save(gateway);
        return gatewayMapper.toResponse(gateway);
    }

    @Override
    @Transactional
    public GatewayResponse update(Long id, UpdateGatewayRequest request) {
        Gateway gateway = getOrThrow(id);
        gateway.setName(request.name());
        gatewayRepository.save(gateway);
        return gatewayMapper.toResponse(gateway);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Gateway gateway = getOrThrow(id);
        gateway.setDeletedAt(Instant.now());
        gatewayRepository.save(gateway);
    }

    private Gateway getOrThrow(Long id) {
        return gatewayRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "GATEWAY_NOT_FOUND", "Không tìm thấy gateway"));
    }
}
