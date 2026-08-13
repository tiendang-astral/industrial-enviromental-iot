package com.corp.iot.backend.externalsource.service;

import com.corp.iot.backend.common.crypto.CredentialEncryptionService;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.scope.ScopeService;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.externalsource.dto.CreateExternalSourceRequest;
import com.corp.iot.backend.externalsource.dto.ExternalSourceCredential;
import com.corp.iot.backend.externalsource.dto.ExternalSourceResponse;
import com.corp.iot.backend.externalsource.dto.UpdateExternalSourceRequest;
import com.corp.iot.backend.externalsource.entity.ExternalSource;
import com.corp.iot.backend.externalsource.mapper.ExternalSourceMapper;
import com.corp.iot.backend.externalsource.repository.ExternalSourceRepository;
import com.corp.iot.backend.externalsourcejob.repository.ExternalSourceJobRepository;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ExternalSourceServiceImpl implements ExternalSourceService {

    // Chỉ hỗ trợ PostgreSQL ở Phase 5 (xem DATABASE.md § external_source) — mở rộng sau bằng
    // migration đổi CHECK constraint, sửa cả set này.
    private static final Set<String> SUPPORTED_CONNECTION_TYPES = Set.of("POSTGRESQL");

    private final ExternalSourceRepository externalSourceRepository;
    private final ExternalSourceJobRepository externalSourceJobRepository;
    private final TenantNodeRepository tenantNodeRepository;
    private final ExternalSourceMapper externalSourceMapper;
    private final CredentialEncryptionService credentialEncryptionService;
    private final ScopeService scopeService;
    private final ObjectMapper objectMapper;

    @Override
    public List<ExternalSourceResponse> list(Long tenantNodeId) {
        return externalSourceRepository.findByTenantNodeId(tenantNodeId).stream()
                .map(externalSourceMapper::toResponse)
                .toList();
    }

    @Override
    public List<ExternalSourceResponse> listAll() {
        // Không truyền tenantNodeId = toàn bộ nguồn trong scope user (trang "Nguồn dữ liệu"),
        // giống pattern GatewayServiceImpl.list() không truyền tenantNodeId.
        AppUserPrincipal principal = (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Set<Long> accessible = scopeService.resolveAccessibleNodeIds(principal.tenantId(), principal.userId());
        return externalSourceRepository.findAll().stream()
                .filter(source -> accessible == null || accessible.contains(source.getTenantNodeId()))
                .map(externalSourceMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ExternalSourceResponse create(Long tenantNodeId, CreateExternalSourceRequest request) {
        if (!tenantNodeRepository.existsById(tenantNodeId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "NODE_NOT_FOUND", "Không tìm thấy node");
        }
        if (!SUPPORTED_CONNECTION_TYPES.contains(request.connectionType())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CONNECTION_TYPE", "Loại kết nối không được hỗ trợ");
        }

        ExternalSource source = new ExternalSource();
        source.setTenantNodeId(tenantNodeId);
        source.setName(request.name());
        source.setConnectionType(request.connectionType());
        source.setConnectionConfig(request.connectionConfig());
        source.setCredentialEncrypted(encryptCredential(request.credential()));
        externalSourceRepository.save(source);
        return externalSourceMapper.toResponse(source);
    }

    @Override
    @Transactional
    public ExternalSourceResponse update(Long id, UpdateExternalSourceRequest request) {
        ExternalSource source = getOrThrow(id);
        source.setName(request.name());
        if (request.connectionConfig() != null) {
            source.setConnectionConfig(request.connectionConfig());
        }
        if (request.credential() != null) {
            source.setCredentialEncrypted(encryptCredential(request.credential()));
        }
        externalSourceRepository.save(source);
        return externalSourceMapper.toResponse(source);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        ExternalSource source = getOrThrow(id);
        if (externalSourceJobRepository.existsByExternalSourceId(id)) {
            throw new BusinessException(HttpStatus.CONFLICT, "SOURCE_HAS_JOBS", "Nguồn còn job, không thể xóa");
        }
        source.setDeletedAt(Instant.now());
        externalSourceRepository.save(source);
    }

    private String encryptCredential(ExternalSourceCredential credential) {
        String json = objectMapper.writeValueAsString(credential);
        return credentialEncryptionService.encrypt(json);
    }

    private ExternalSource getOrThrow(Long id) {
        return externalSourceRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "SOURCE_NOT_FOUND", "Không tìm thấy nguồn dữ liệu"));
    }
}
