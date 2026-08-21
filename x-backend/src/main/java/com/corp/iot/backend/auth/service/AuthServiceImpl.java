package com.corp.iot.backend.auth.service;

import com.corp.iot.backend.auth.dto.ChangePasswordRequest;
import com.corp.iot.backend.auth.dto.MeResponse;
import com.corp.iot.backend.auth.dto.UpdateMeRequest;
import com.corp.iot.backend.common.enums.AccountStatus;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.common.security.JwtService;
import com.corp.iot.backend.common.security.RefreshTokenSupport;
import com.corp.iot.backend.common.security.UserType;
import com.corp.iot.backend.common.tenant.TenantContext;
import com.corp.iot.backend.platformuser.entity.PlatformUser;
import com.corp.iot.backend.platformuser.repository.PlatformUserRepository;
import com.corp.iot.backend.refreshtoken.entity.RefreshToken;
import com.corp.iot.backend.refreshtoken.repository.RefreshTokenRepository;
import com.corp.iot.backend.role.repository.TenantRoleRepository;
import com.corp.iot.backend.tenant.entity.Tenant;
import com.corp.iot.backend.tenant.repository.TenantRepository;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import com.corp.iot.backend.tenantuser.entity.TenantUser;
import com.corp.iot.backend.tenantuser.repository.TenantUserRepository;
import com.corp.iot.backend.userrolescope.entity.UserRoleScope;
import com.corp.iot.backend.userrolescope.repository.UserRoleScopeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final PlatformUserRepository platformUserRepository;
    private final TenantUserRepository tenantUserRepository;
    private final TenantRepository tenantRepository;
    private final TenantNodeRepository tenantNodeRepository;
    private final TenantRoleRepository tenantRoleRepository;
    private final UserRoleScopeRepository userRoleScopeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${app.refresh-token.ttl-days}")
    private long refreshTokenTtlDays;

    @Override
    public LoginResult loginPlatform(String username, String password) {
        PlatformUser user = platformUserRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(this::invalidCredentials);
        return loginAsPlatformUser(user, password);
    }

    @Override
    public LoginResult loginTenant(String username, String password) {
        TenantUser user = tenantUserRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(this::invalidCredentials);
        return loginAsTenantUser(user, password);
    }

    private LoginResult loginAsPlatformUser(PlatformUser user, String password) {
        if (user.getStatus() != AccountStatus.ACTIVE || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw invalidCredentials();
        }
        AppUserPrincipal principal = new AppUserPrincipal(
                user.getId(), null, user.getUsername(), UserType.PLATFORM, List.of("PLATFORM_ADMIN")
        );
        String rawRefreshToken = issueRefreshToken(null, null, user.getId());
        return buildLoginResult(principal, rawRefreshToken, toMeResponse(principal, user.getFullName(), user.getEmail()));
    }

    private LoginResult loginAsTenantUser(TenantUser user, String password) {
        if (user.getStatus() != AccountStatus.ACTIVE || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw invalidCredentials();
        }
        verifyTenantActive(user.getTenantId());
        TenantContext.setTenantId(user.getTenantId());
        List<String> authorities = resolveTenantAuthorities(user.getId());
        AppUserPrincipal principal = new AppUserPrincipal(
                user.getId(), user.getTenantId(), user.getUsername(), UserType.TENANT, authorities
        );
        String rawRefreshToken = issueRefreshToken(user.getTenantId(), user.getId(), null);
        return buildLoginResult(principal, rawRefreshToken, toMeResponse(principal, user.getFullName(), user.getEmail()));
    }

    private List<String> resolveTenantAuthorities(Long tenantUserId) {
        List<UserRoleScope> scopes = userRoleScopeRepository.findByUserId(tenantUserId);
        return scopes.stream()
                .map(scope -> tenantRoleRepository.findById(scope.getRoleId()))
                .filter(Optional::isPresent)
                .map(role -> role.get().getValue())
                .distinct()
                .toList();
    }

    @Override
    public LoginResult refresh(String rawRefreshToken) {
        RefreshToken stored = findActiveRefreshToken(rawRefreshToken);
        stored.setRevokedAt(Instant.now());
        refreshTokenRepository.save(stored);

        if (stored.getPlatformUserId() != null) {
            PlatformUser user = platformUserRepository.findById(stored.getPlatformUserId())
                    .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Token không hợp lệ"));
            if (user.getStatus() != AccountStatus.ACTIVE) {
                throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Token không hợp lệ");
            }
            AppUserPrincipal principal = new AppUserPrincipal(
                    user.getId(), null, user.getUsername(), UserType.PLATFORM, List.of("PLATFORM_ADMIN")
            );
            String newRawRefreshToken = issueRefreshToken(null, null, user.getId());
            return buildLoginResult(principal, newRawRefreshToken, toMeResponse(principal, user.getFullName(), user.getEmail()));
        }

        TenantContext.setTenantId(stored.getTenantId());
        TenantUser user = tenantUserRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Token không hợp lệ"));
        if (user.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Token không hợp lệ");
        }
        verifyTenantActive(user.getTenantId());
        List<String> authorities = resolveTenantAuthorities(user.getId());
        AppUserPrincipal principal = new AppUserPrincipal(
                user.getId(), user.getTenantId(), user.getUsername(), UserType.TENANT, authorities
        );
        String newRawRefreshToken = issueRefreshToken(user.getTenantId(), user.getId(), null);
        return buildLoginResult(principal, newRawRefreshToken, toMeResponse(principal, user.getFullName(), user.getEmail()));
    }

    @Override
    public void logout(String rawRefreshToken) {
        String hash = RefreshTokenSupport.hash(rawRefreshToken);
        refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(hash).ifPresent(token -> {
            token.setRevokedAt(Instant.now());
            refreshTokenRepository.save(token);
        });
    }

    @Override
    public MeResponse me(AppUserPrincipal principal) {
        if (principal.type() == UserType.PLATFORM) {
            PlatformUser user = platformUserRepository.findById(principal.userId())
                    .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy user"));
            return toMeResponse(principal, user.getFullName(), user.getEmail());
        }
        TenantUser user = tenantUserRepository.findById(principal.userId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy user"));
        return toMeResponse(principal, user.getFullName(), user.getEmail());
    }

    @Override
    @Transactional
    public MeResponse updateMe(AppUserPrincipal principal, UpdateMeRequest request) {
        String email = normalizeEmail(request.email());
        try {
            if (principal.type() == UserType.PLATFORM) {
                PlatformUser user = platformUserRepository.findById(principal.userId())
                        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy user"));
                user.setFullName(request.fullName());
                user.setEmail(email);
                platformUserRepository.saveAndFlush(user);
                return toMeResponse(principal, user.getFullName(), user.getEmail());
            }
            TenantUser user = tenantUserRepository.findById(principal.userId())
                    .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy user"));
            user.setFullName(request.fullName());
            user.setEmail(email);
            tenantUserRepository.saveAndFlush(user);
            return toMeResponse(principal, user.getFullName(), user.getEmail());
        } catch (DataIntegrityViolationException e) {
            // Email unique theo lower(email) trên TOÀN PLATFORM, trong khi TenantUser gắn @TenantId
            // nên query kiểm tra trước chỉ thấy được user cùng tenant — không đủ. Để DB làm trọng
            // tài rồi dịch lỗi, thay vì tự check rồi vẫn vỡ ở tenant khác.
            throw new BusinessException(HttpStatus.BAD_REQUEST, "EMAIL_TAKEN", "Email này đã được tài khoản khác sử dụng");
        }
    }

    /** Ô email để trống nghĩa là gỡ email, không phải lưu chuỗi rỗng (cột unique, '' sẽ đụng nhau). */
    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Override
    @Transactional
    public void changePassword(AppUserPrincipal principal, ChangePasswordRequest request) {
        if (principal.type() == UserType.PLATFORM) {
            PlatformUser user = platformUserRepository.findById(principal.userId())
                    .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy user"));
            verifyCurrentPassword(request.currentPassword(), user.getPasswordHash());
            verifyNewPasswordDiffers(request.newPassword(), user.getPasswordHash());
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
            platformUserRepository.save(user);
            refreshTokenRepository.revokeAllByPlatformUserId(user.getId(), Instant.now());
            return;
        }
        TenantUser user = tenantUserRepository.findById(principal.userId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy user"));
        verifyCurrentPassword(request.currentPassword(), user.getPasswordHash());
        verifyNewPasswordDiffers(request.newPassword(), user.getPasswordHash());
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        tenantUserRepository.save(user);
        refreshTokenRepository.revokeAllByUserId(user.getId(), Instant.now());
    }

    private void verifyCurrentPassword(String rawPassword, String storedHash) {
        if (!passwordEncoder.matches(rawPassword, storedHash)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CURRENT_PASSWORD", "Mật khẩu hiện tại không đúng");
        }
    }

    private void verifyNewPasswordDiffers(String newPassword, String currentHash) {
        if (passwordEncoder.matches(newPassword, currentHash)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "SAME_AS_OLD_PASSWORD", "Mật khẩu mới phải khác mật khẩu hiện tại");
        }
    }

    private void verifyTenantActive(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Sai tài khoản hoặc mật khẩu"));
        if (tenant.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "TENANT_LOCKED", "Tenant đã bị khóa, vui lòng liên hệ quản trị viên");
        }
    }

    private RefreshToken findActiveRefreshToken(String rawRefreshToken) {
        String hash = RefreshTokenSupport.hash(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(hash)
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Token không hợp lệ hoặc đã hết hạn"));
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Token đã hết hạn");
        }
        return stored;
    }

    private String issueRefreshToken(Long tenantId, Long userId, Long platformUserId) {
        String rawToken = RefreshTokenSupport.generateRawToken();
        RefreshToken token = new RefreshToken();
        token.setTenantId(tenantId);
        token.setUserId(userId);
        token.setPlatformUserId(platformUserId);
        token.setTokenHash(RefreshTokenSupport.hash(rawToken));
        token.setExpiresAt(Instant.now().plus(Duration.ofDays(refreshTokenTtlDays)));
        refreshTokenRepository.save(token);
        return rawToken;
    }

    private LoginResult buildLoginResult(AppUserPrincipal principal, String rawRefreshToken, MeResponse user) {
        String accessToken = jwtService.generateAccessToken(principal);
        return new LoginResult(accessToken, jwtService.getAccessTokenTtlSeconds(), rawRefreshToken, user);
    }

    private MeResponse toMeResponse(AppUserPrincipal principal, String fullName, String email) {
        return new MeResponse(
                principal.userId(),
                principal.username(),
                fullName,
                email,
                principal.type().name(),
                principal.tenantId(),
                principal.authorities(),
                resolveOrganizationPath(principal)
        );
    }

    // "Vai trò" đã có sẵn qua authorities — chỉ cần build "Tổ chức" (đường dẫn
    // root -> node hiện tại) cho tenant_user, theo từng scope trong user_role_scope.
    private String resolveOrganizationPath(AppUserPrincipal principal) {
        if (principal.type() != UserType.TENANT) {
            return null;
        }
        List<UserRoleScope> scopes = userRoleScopeRepository.findByUserId(principal.userId());
        List<String> paths = scopes.stream()
                .map(scope -> scope.getTenantNodeId() == null ? rootNodeName() : buildNodePath(scope.getTenantNodeId()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return paths.isEmpty() ? null : String.join("; ", paths);
    }

    private String rootNodeName() {
        return tenantNodeRepository.findByParentIdIsNull().map(TenantNode::getName).orElse(null);
    }

    private String buildNodePath(Long tenantNodeId) {
        return tenantNodeRepository.findById(tenantNodeId).map(node -> {
            List<Long> ancestorIds = java.util.Arrays.stream(node.getPath().split("\\."))
                    .map(Long::valueOf)
                    .toList();
            Map<Long, String> namesById = tenantNodeRepository.findAllById(ancestorIds).stream()
                    .collect(Collectors.toMap(TenantNode::getId, TenantNode::getName));
            return ancestorIds.stream()
                    .map(namesById::get)
                    .filter(Objects::nonNull)
                    .collect(Collectors.joining(" → "));
        }).orElse(null);
    }

    private BusinessException invalidCredentials() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Sai tài khoản hoặc mật khẩu");
    }
}
