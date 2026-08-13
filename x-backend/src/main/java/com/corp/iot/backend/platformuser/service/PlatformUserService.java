package com.corp.iot.backend.platformuser.service;

import com.corp.iot.backend.platformuser.dto.CreatePlatformUserRequest;
import com.corp.iot.backend.platformuser.dto.PlatformUserResponse;
import com.corp.iot.backend.platformuser.dto.UpdatePlatformUserStatusRequest;

import java.util.List;

public interface PlatformUserService {

    PlatformUserResponse create(CreatePlatformUserRequest request);

    List<PlatformUserResponse> list();

    void delete(Long id, Long currentUserId);

    PlatformUserResponse updateStatus(Long id, UpdatePlatformUserStatusRequest request, Long currentUserId);
}
