package com.corp.iot.backend.platformuser.service;

import com.corp.iot.backend.common.enums.AccountStatus;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.platformuser.dto.CreatePlatformUserRequest;
import com.corp.iot.backend.platformuser.dto.PlatformUserResponse;
import com.corp.iot.backend.platformuser.dto.UpdatePlatformUserStatusRequest;
import com.corp.iot.backend.platformuser.entity.PlatformUser;
import com.corp.iot.backend.platformuser.mapper.PlatformUserMapper;
import com.corp.iot.backend.platformuser.repository.PlatformUserRepository;
import com.corp.iot.backend.refreshtoken.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PlatformUserServiceImpl implements PlatformUserService {

    private final PlatformUserRepository platformUserRepository;
    private final PlatformUserMapper platformUserMapper;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;

    @Override
    public PlatformUserResponse create(CreatePlatformUserRequest request) {
        if (platformUserRepository.findByUsernameIgnoreCase(request.username()).isPresent()) {
            throw new BusinessException(HttpStatus.CONFLICT, "USERNAME_TAKEN", "Username đã tồn tại");
        }
        PlatformUser user = new PlatformUser();
        user.setUsername(request.username());
        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        platformUserRepository.save(user);
        return platformUserMapper.toResponse(user);
    }

    @Override
    public List<PlatformUserResponse> list() {
        return platformUserRepository.findAll().stream().map(platformUserMapper::toResponse).toList();
    }

    @Override
    @Transactional
    public void delete(Long id, Long currentUserId) {
        verifyNotSelf(id, currentUserId);
        PlatformUser user = getOrThrow(id);
        user.setDeletedAt(Instant.now());
        platformUserRepository.save(user);
        refreshTokenRepository.revokeAllByPlatformUserId(id, Instant.now());
    }

    @Override
    @Transactional
    public PlatformUserResponse updateStatus(Long id, UpdatePlatformUserStatusRequest request, Long currentUserId) {
        verifyNotSelf(id, currentUserId);
        PlatformUser user = getOrThrow(id);
        AccountStatus status = AccountStatus.valueOf(request.status());
        user.setStatus(status);
        platformUserRepository.save(user);
        if (status == AccountStatus.LOCKED) {
            refreshTokenRepository.revokeAllByPlatformUserId(id, Instant.now());
        }
        return platformUserMapper.toResponse(user);
    }

    private void verifyNotSelf(Long id, Long currentUserId) {
        if (id.equals(currentUserId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "SELF_ACTION_FORBIDDEN", "Không thể tự xoá/khoá chính mình");
        }
    }

    private PlatformUser getOrThrow(Long id) {
        return platformUserRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy user"));
    }
}
