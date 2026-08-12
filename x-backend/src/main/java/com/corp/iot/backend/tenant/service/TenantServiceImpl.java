package com.corp.iot.backend.tenant.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.tenant.TenantContext;
import com.corp.iot.backend.platformuser.repository.PlatformUserRepository;
import com.corp.iot.backend.role.entity.TenantRole;
import com.corp.iot.backend.role.repository.TenantRoleRepository;
import com.corp.iot.backend.tenantnode.service.TenantNodeService;
import com.corp.iot.backend.tenant.dto.CreateTenantRequest;
import com.corp.iot.backend.tenant.dto.TenantResponse;
import com.corp.iot.backend.tenant.entity.Tenant;
import com.corp.iot.backend.tenant.mapper.TenantMapper;
import com.corp.iot.backend.tenant.repository.TenantRepository;
import com.corp.iot.backend.tenantuser.entity.TenantUser;
import com.corp.iot.backend.tenantuser.repository.TenantUserRepository;
import com.corp.iot.backend.userrolescope.entity.UserRoleScope;
import com.corp.iot.backend.userrolescope.repository.UserRoleScopeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * createTenant() KHÔNG bọc @Transactional — mỗi repository call cần tự mở
 * Session riêng để CurrentTenantIdentifierResolver resolve lại đúng tenant_id
 * MỚI (set qua TenantContext) ngay sau khi tenant được tạo. Đánh đổi: mất tính
 * atomic (nếu bước sau lỗi, tenant đã tạo vẫn còn) — chấp nhận được vì đây là
 * tác vụ hiếm (System Admin tạo tenant), không phải luồng tần suất cao.
 */
@Service
@RequiredArgsConstructor
public class TenantServiceImpl implements TenantService {

    private static final List<String[]> DEFAULT_TENANT_ROLES = List.of(
            new String[]{"Tenant Admin", "TENANT_ADMIN"},
            new String[]{"Manager", "MANAGER"},
            new String[]{"Operator", "OPERATOR"},
            new String[]{"Viewer", "VIEWER"}
    );

    private final TenantRepository tenantRepository;
    private final TenantRoleRepository tenantRoleRepository;
    private final TenantUserRepository tenantUserRepository;
    private final UserRoleScopeRepository userRoleScopeRepository;
    private final PlatformUserRepository platformUserRepository;
    private final TenantNodeService tenantNodeService;
    private final TenantMapper tenantMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public TenantResponse create(CreateTenantRequest request) {
        boolean usernameTaken = platformUserRepository.findByUsernameIgnoreCase(request.adminUsername()).isPresent()
                || tenantUserRepository.findByUsernameIgnoreCase(request.adminUsername()).isPresent();
        if (usernameTaken) {
            throw new BusinessException(HttpStatus.CONFLICT, "USERNAME_TAKEN", "Username đã tồn tại");
        }

        Tenant tenant = new Tenant();
        tenant.setName(request.name());
        tenant.setEmail(request.email());
        tenantRepository.save(tenant);

        TenantContext.setTenantId(tenant.getId());
        try {
            List<TenantRole> roles = tenantRoleRepository.saveAll(
                    DEFAULT_TENANT_ROLES.stream().map(r -> new TenantRole(r[0], r[1])).toList()
            );
            Long adminRoleId = roles.stream()
                    .filter(role -> role.getValue().equals("TENANT_ADMIN"))
                    .findFirst()
                    .orElseThrow()
                    .getId();

            TenantUser admin = new TenantUser();
            admin.setUsername(request.adminUsername());
            admin.setFullName(request.adminFullName());
            admin.setEmail(request.adminEmail());
            admin.setPasswordHash(passwordEncoder.encode(request.adminPassword()));
            tenantUserRepository.save(admin);

            userRoleScopeRepository.save(new UserRoleScope(admin.getId(), adminRoleId, null));

            tenantNodeService.createRoot(tenant.getName());
        } finally {
            TenantContext.clear();
        }

        return tenantMapper.toResponse(tenant);
    }

    @Override
    public List<TenantResponse> list() {
        return tenantRepository.findAll().stream().map(tenantMapper::toResponse).toList();
    }
}
