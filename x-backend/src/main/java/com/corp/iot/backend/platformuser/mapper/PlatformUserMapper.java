package com.corp.iot.backend.platformuser.mapper;

import com.corp.iot.backend.platformuser.dto.PlatformUserResponse;
import com.corp.iot.backend.platformuser.entity.PlatformUser;
import org.springframework.stereotype.Component;

@Component
public class PlatformUserMapper {

    public PlatformUserResponse toResponse(PlatformUser user) {
        return new PlatformUserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getStatus().name(),
                user.getCreatedAt()
        );
    }
}
