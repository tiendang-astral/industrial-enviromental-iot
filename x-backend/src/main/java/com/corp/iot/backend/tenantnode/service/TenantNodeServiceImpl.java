package com.corp.iot.backend.tenantnode.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.common.tenant.TenantContext;
import com.corp.iot.backend.gateway.repository.GatewayRepository;
import com.corp.iot.backend.tenant.entity.Tenant;
import com.corp.iot.backend.tenant.repository.TenantRepository;
import com.corp.iot.backend.tenantnode.dto.CreateTenantNodeRequest;
import com.corp.iot.backend.tenantnode.dto.MoveTenantNodeRequest;
import com.corp.iot.backend.tenantnode.dto.TenantNodeResponse;
import com.corp.iot.backend.tenantnode.dto.UpdateTenantNodeRequest;
import com.corp.iot.backend.tenantnode.dto.UpdateTenantNodeStatusRequest;
import com.corp.iot.backend.tenantnode.entity.NodeType;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.mapper.TenantNodeMapper;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TenantNodeServiceImpl implements TenantNodeService {

    private static final Map<NodeType, NodeType> REQUIRED_PARENT_TYPE = Map.of(
            NodeType.BRANCH, NodeType.TENANT_ROOT,
            NodeType.PRODUCTION_AREA, NodeType.BRANCH,
            NodeType.SITE, NodeType.PRODUCTION_AREA
    );

    private final TenantNodeRepository tenantNodeRepository;
    private final GatewayRepository gatewayRepository;
    private final TenantRepository tenantRepository;
    private final TenantNodeMapper tenantNodeMapper;
    private final ScopeService scopeService;

    @Override
    public List<TenantNodeResponse> list() {
        AppUserPrincipal principal = currentPrincipal();
        Set<Long> accessible = scopeService.resolveAccessibleNodeIds(principal.tenantId(), principal.userId());
        return tenantNodeRepository.findAllByOrderByPathAsc().stream()
                .filter(node -> accessible == null || accessible.contains(node.getId()))
                .map(tenantNodeMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public TenantNodeResponse create(CreateTenantNodeRequest request) {
        NodeType nodeType = parseNodeType(request.nodeType());
        if (nodeType == NodeType.TENANT_ROOT) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_NODE_TYPE", "Không thể tạo thêm TENANT_ROOT");
        }
        TenantNode parent = getOrThrow(request.parentId());
        validateHierarchy(nodeType, parent.getNodeType());
        if (!parent.isEnabled()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "PARENT_NODE_DISABLED", "Không thể tạo node con dưới node đã tắt");
        }

        TenantNode node = new TenantNode();
        node.setParentId(parent.getId());
        node.setNodeType(nodeType);
        node.setName(request.name());
        node.setPath(parent.getPath());
        node.setDepth(parent.getDepth() + 1);
        tenantNodeRepository.save(node);

        String realPath = parent.getPath() + "." + node.getId();
        tenantNodeRepository.writePath(node.getId(), realPath, node.getDepth());
        node.setPath(realPath);

        return tenantNodeMapper.toResponse(node);
    }

    @Override
    @Transactional
    public TenantNodeResponse rename(Long id, UpdateTenantNodeRequest request) {
        TenantNode node = getOrThrow(id);
        node.setName(request.name());
        tenantNodeRepository.save(node);

        // TENANT_ROOT = "tên công ty" hiển thị ở Tổ chức — đồng bộ luôn tenant.name
        // để platform (bảng Tenant) thấy đúng tên mới (xem DATABASE.md § tenant).
        if (node.getNodeType() == NodeType.TENANT_ROOT) {
            Tenant tenant = tenantRepository.findById(TenantContext.getTenantId())
                    .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND", "Không tìm thấy tenant"));
            tenant.setName(request.name());
            tenantRepository.save(tenant);
        }

        return tenantNodeMapper.toResponse(node);
    }

    @Override
    @Transactional
    public TenantNodeResponse move(Long id, MoveTenantNodeRequest request) {
        TenantNode node = getOrThrow(id);
        if (node.getNodeType() == NodeType.TENANT_ROOT) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "CANNOT_MOVE_ROOT", "Không thể di chuyển TENANT_ROOT");
        }
        TenantNode newParent = getOrThrow(request.newParentId());
        if (newParent.getId().equals(node.getId())
                || newParent.getPath().equals(node.getPath())
                || newParent.getPath().startsWith(node.getPath() + ".")) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "NODE_MOVE_CYCLE",
                    "Không thể di chuyển node vào chính subtree của nó");
        }
        validateHierarchy(node.getNodeType(), newParent.getNodeType());

        Long tenantId = TenantContext.getTenantId();
        int oldSelfDepth = node.getDepth();
        int newSelfDepth = newParent.getDepth() + 1;
        int depthDiff = newSelfDepth - oldSelfDepth;
        tenantNodeRepository.moveSubtree(tenantId, node.getPath(), oldSelfDepth - 1, newParent.getPath(), depthDiff);
        tenantNodeRepository.updateParentId(node.getId(), newParent.getId());

        node.setParentId(newParent.getId());
        node.setPath(newParent.getPath() + "." + node.getId());
        node.setDepth(newSelfDepth);
        return tenantNodeMapper.toResponse(node);
    }

    @Override
    @Transactional
    public TenantNodeResponse updateStatus(Long id, UpdateTenantNodeStatusRequest request) {
        TenantNode node = getOrThrow(id);
        node.setEnabled(request.enabled());
        tenantNodeRepository.save(node);
        return tenantNodeMapper.toResponse(node);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        TenantNode node = getOrThrow(id);
        if (tenantNodeRepository.existsByParentId(id)) {
            throw new BusinessException(HttpStatus.CONFLICT, "NODE_HAS_CHILDREN", "Node còn node con, không thể xóa");
        }
        if (gatewayRepository.existsByTenantNodeId(id)) {
            throw new BusinessException(HttpStatus.CONFLICT, "NODE_HAS_DEPENDENCIES", "Node còn gateway gắn vào, không thể xóa");
        }
        node.setDeletedAt(Instant.now());
        tenantNodeRepository.save(node);
    }

    @Override
    @Transactional
    public TenantNodeResponse createRoot(String name) {
        TenantNode node = new TenantNode();
        node.setParentId(null);
        node.setNodeType(NodeType.TENANT_ROOT);
        node.setName(name);
        node.setPath("root");
        node.setDepth(1);
        tenantNodeRepository.save(node);

        String realPath = String.valueOf(node.getId());
        tenantNodeRepository.writePath(node.getId(), realPath, 1);
        node.setPath(realPath);

        return tenantNodeMapper.toResponse(node);
    }

    private void validateHierarchy(NodeType nodeType, NodeType parentType) {
        NodeType requiredParent = REQUIRED_PARENT_TYPE.get(nodeType);
        if (requiredParent != parentType) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PARENT_NODE_TYPE",
                    "%s phải có node cha kiểu %s".formatted(nodeType, requiredParent));
        }
    }

    private NodeType parseNodeType(String raw) {
        try {
            return NodeType.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_NODE_TYPE", "node_type không hợp lệ");
        }
    }

    private TenantNode getOrThrow(Long id) {
        return tenantNodeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NODE_NOT_FOUND", "Không tìm thấy node"));
    }

    private AppUserPrincipal currentPrincipal() {
        return (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
