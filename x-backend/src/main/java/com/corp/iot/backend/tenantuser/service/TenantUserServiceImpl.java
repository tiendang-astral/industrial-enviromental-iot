package com.corp.iot.backend.tenantuser.service;

import com.corp.iot.backend.common.enums.AccountStatus;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.platformuser.repository.PlatformUserRepository;
import com.corp.iot.backend.refreshtoken.repository.RefreshTokenRepository;
import com.corp.iot.backend.role.entity.TenantRole;
import com.corp.iot.backend.role.repository.TenantRoleRepository;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import com.corp.iot.backend.tenantuser.dto.CreateTenantUserRequest;
import com.corp.iot.backend.tenantuser.dto.ResetTenantUserPasswordRequest;
import com.corp.iot.backend.tenantuser.dto.TenantUserResponse;
import com.corp.iot.backend.tenantuser.dto.UpdateTenantUserRequest;
import com.corp.iot.backend.tenantuser.dto.UpdateTenantUserStatusRequest;
import com.corp.iot.backend.tenantuser.dto.UserScopeRequest;
import com.corp.iot.backend.tenantuser.entity.TenantUser;
import com.corp.iot.backend.tenantuser.mapper.TenantUserMapper;
import com.corp.iot.backend.tenantuser.repository.TenantUserRepository;
import com.corp.iot.backend.userrolescope.entity.UserRoleScope;
import com.corp.iot.backend.userrolescope.repository.UserRoleScopeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TenantUserServiceImpl implements TenantUserService {

    private static final String TENANT_ADMIN = "TENANT_ADMIN";

    private final TenantUserRepository tenantUserRepository;
    private final PlatformUserRepository platformUserRepository;
    private final UserRoleScopeRepository userRoleScopeRepository;
    private final TenantRoleRepository tenantRoleRepository;
    private final TenantNodeRepository tenantNodeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TenantUserMapper tenantUserMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<TenantUserResponse> list() {
        List<TenantUser> users = tenantUserRepository.findAllByOrderByUsernameAsc();
        if (users.isEmpty()) return List.of();

        Map<Long, List<UserRoleScope>> scopesByUser = userRoleScopeRepository
                .findByUserIdIn(users.stream().map(TenantUser::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(UserRoleScope::getUserId));

        Map<Long, TenantRole> roleById = roleById();
        Map<Long, TenantNode> nodeById = nodeById();

        return users.stream()
                .map(user -> tenantUserMapper.toResponse(
                        user,
                        scopesByUser.getOrDefault(user.getId(), List.of()),
                        roleById,
                        nodeById))
                .toList();
    }

    @Override
    @Transactional
    public TenantUserResponse create(CreateTenantUserRequest request) {
        // Username unique toàn platform và dùng chung không gian với platform_user, nên phải hỏi
        // cả 2 bảng (giống TenantServiceImpl.create khi tạo admin đầu tiên).
        if (tenantUserRepository.usernameExistsPlatformWide(request.username())
                || platformUserRepository.findByUsernameIgnoreCase(request.username()).isPresent()) {
            throw new BusinessException(HttpStatus.CONFLICT, "USERNAME_TAKEN", "Username đã tồn tại");
        }
        String email = normalizeEmail(request.email());
        verifyEmailFree(email, null);
        validateScopes(request.scopes());

        TenantUser user = new TenantUser();
        user.setUsername(request.username());
        user.setFullName(request.fullName());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        tenantUserRepository.save(user);

        replaceScopes(user.getId(), request.scopes());
        return toResponse(user);
    }

    @Override
    @Transactional
    public TenantUserResponse update(Long id, UpdateTenantUserRequest request) {
        TenantUser user = getOrThrow(id);
        String email = normalizeEmail(request.email());
        verifyEmailFree(email, id);
        validateScopes(request.scopes());
        verifyKeepsLastAdmin(id, request.scopes());

        user.setFullName(request.fullName());
        user.setEmail(email);
        tenantUserRepository.save(user);

        replaceScopes(id, request.scopes());
        return toResponse(user);
    }

    @Override
    @Transactional
    public TenantUserResponse updateStatus(Long id, UpdateTenantUserStatusRequest request, Long currentUserId) {
        verifyNotSelf(id, currentUserId);
        TenantUser user = getOrThrow(id);
        AccountStatus status = AccountStatus.valueOf(request.status());
        if (status == AccountStatus.LOCKED) verifyNotLastActiveAdmin(id);

        user.setStatus(status);
        tenantUserRepository.save(user);
        if (status == AccountStatus.LOCKED) {
            refreshTokenRepository.revokeAllByUserId(id, Instant.now());
        }
        return toResponse(user);
    }

    @Override
    @Transactional
    public void resetPassword(Long id, ResetTenantUserPasswordRequest request) {
        TenantUser user = getOrThrow(id);
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        tenantUserRepository.save(user);
        // Đặt lại mật khẩu là để lấy lại quyền kiểm soát một tài khoản; mọi phiên đang mở của nó
        // phải chết theo, nếu không thì người đang chiếm tài khoản vẫn dùng tiếp bằng token cũ.
        refreshTokenRepository.revokeAllByUserId(id, Instant.now());
    }

    @Override
    @Transactional
    public void delete(Long id, Long currentUserId) {
        verifyNotSelf(id, currentUserId);
        verifyNotLastActiveAdmin(id);
        TenantUser user = getOrThrow(id);

        user.setDeletedAt(Instant.now());
        tenantUserRepository.save(user);
        userRoleScopeRepository.deleteByUserId(id);
        refreshTokenRepository.revokeAllByUserId(id, Instant.now());
    }

    // ---------------------------------------------------------------- helpers

    private TenantUserResponse toResponse(TenantUser user) {
        return tenantUserMapper.toResponse(
                user, userRoleScopeRepository.findByUserId(user.getId()), roleById(), nodeById());
    }

    private Map<Long, TenantRole> roleById() {
        return tenantRoleRepository.findAll().stream()
                .collect(Collectors.toMap(TenantRole::getId, Function.identity()));
    }

    private Map<Long, TenantNode> nodeById() {
        return tenantNodeRepository.findAll().stream()
                .collect(Collectors.toMap(TenantNode::getId, Function.identity()));
    }

    private String normalizeEmail(String email) {
        // Lưu NULL thay vì chuỗi rỗng: uq_tenant_user_email là partial index bỏ qua NULL, nhưng
        // nhiều bản ghi cùng '' thì đụng nhau ngay ở user thứ hai bỏ trống email.
        return email == null || email.isBlank() ? null : email.trim();
    }

    private void verifyEmailFree(String email, Long excludeId) {
        if (email != null && tenantUserRepository.emailExistsPlatformWide(email, excludeId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "EMAIL_TAKEN", "Email đã được dùng cho tài khoản khác");
        }
    }

    private void validateScopes(List<UserScopeRequest> scopes) {
        /*
         * Một user = MỘT vai trò, áp cho nhiều đơn vị. Lý do không phải thẩm mỹ: lúc đăng nhập,
         * AuthServiceImpl.resolveTenantAuthorities() gộp phẳng vai trò thành `authorities` trong JWT
         * và BỎ phần đơn vị đi kèm, còn ScopeService gộp phạm vi thành hợp của mọi node. Nếu cho
         * nhiều vai trò khác nhau ở các đơn vị khác nhau thì user dùng được vai trò cao nhất trên
         * TOÀN BỘ phạm vi — dữ liệu hứa một đằng, kiểm tra quyền làm một nẻo. Chặn ở đây để cái
         * shape nhiều dòng của `user_role_scope` không sinh ra được trạng thái đó.
         */
        long distinctRoles = scopes.stream().map(UserScopeRequest::roleId).distinct().count();
        if (distinctRoles > 1) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "SINGLE_ROLE_ONLY",
                    "Mỗi người dùng chỉ được gán một vai trò, áp dụng cho một hoặc nhiều đơn vị");
        }

        Set<Long> validRoleIds = tenantRoleRepository.findAll().stream()
                .map(TenantRole::getId).collect(Collectors.toSet());
        for (UserScopeRequest scope : scopes) {
            if (!validRoleIds.contains(scope.roleId())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "ROLE_NOT_FOUND", "Vai trò không tồn tại trong tenant");
            }
            if (scope.tenantNodeId() != null && tenantNodeRepository.findById(scope.tenantNodeId()).isEmpty()) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "NODE_NOT_FOUND", "Đơn vị được phân quyền không tồn tại");
            }
        }
    }

    private void replaceScopes(Long userId, List<UserScopeRequest> scopes) {
        userRoleScopeRepository.deleteByUserId(userId);
        /*
         * flush() BẮT BUỘC: trong cùng một transaction, Hibernate xếp INSERT trước DELETE trong
         * action queue, nên nếu không ép xoá xuống DB ngay thì dòng cũ vẫn còn lúc INSERT chạy và
         * uq_user_role_scope nổ (gặp thật khi sửa user mà giữ nguyên một trong các vai trò cũ).
         */
        userRoleScopeRepository.flush();
        // Dedupe: uq_user_role_scope là (tenant_id, user_id, role_id, COALESCE(tenant_node_id, 0)),
        // gửi trùng cặp role+node sẽ ném DataIntegrityViolation thay vì lỗi nghiệp vụ đọc được.
        userRoleScopeRepository.saveAll(
                scopes.stream()
                        .distinct()
                        .map(scope -> new UserRoleScope(userId, scope.roleId(), scope.tenantNodeId()))
                        .toList()
        );
    }

    /** Số user ACTIVE (không tính `excludeUserId`) còn giữ vai trò TENANT_ADMIN. */
    private long otherActiveAdminCount(Long excludeUserId) {
        Long adminRoleId = tenantRoleRepository.findByValue(TENANT_ADMIN).map(TenantRole::getId).orElse(null);
        if (adminRoleId == null) return 0;

        Set<Long> adminUserIds = userRoleScopeRepository.findByRoleId(adminRoleId).stream()
                .map(UserRoleScope::getUserId)
                .filter(userId -> !userId.equals(excludeUserId))
                .collect(Collectors.toSet());
        if (adminUserIds.isEmpty()) return 0;

        return tenantUserRepository.findAllById(adminUserIds).stream()
                .filter(user -> user.getStatus() == AccountStatus.ACTIVE)
                .count();
    }

    /** Chặn xoá/khoá Tenant Admin ACTIVE cuối cùng — mất nó là tenant không còn ai quản trị được. */
    private void verifyNotLastActiveAdmin(Long userId) {
        boolean isAdmin = userRoleScopeRepository.findByUserId(userId).stream()
                .anyMatch(scope -> tenantRoleRepository.findById(scope.getRoleId())
                        .map(role -> TENANT_ADMIN.equals(role.getValue()))
                        .orElse(false));
        if (isAdmin && otherActiveAdminCount(userId) == 0) {
            throw new BusinessException(HttpStatus.CONFLICT, "LAST_TENANT_ADMIN",
                    "Đây là quản trị viên đang hoạt động cuối cùng của tenant, không thể khoá hoặc xoá");
        }
    }

    /** Chặn luôn việc hạ vai trò admin cuối cùng qua form Sửa — cùng hậu quả với xoá. */
    private void verifyKeepsLastAdmin(Long userId, List<UserScopeRequest> newScopes) {
        boolean staysAdmin = newScopes.stream()
                .anyMatch(scope -> tenantRoleRepository.findById(scope.roleId())
                        .map(role -> TENANT_ADMIN.equals(role.getValue()))
                        .orElse(false));
        if (staysAdmin) return;
        verifyNotLastActiveAdmin(userId);
    }

    private void verifyNotSelf(Long id, Long currentUserId) {
        if (id.equals(currentUserId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "SELF_ACTION_FORBIDDEN",
                    "Không thể tự xoá hoặc khoá chính mình");
        }
    }

    private TenantUser getOrThrow(Long id) {
        return tenantUserRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));
    }
}
