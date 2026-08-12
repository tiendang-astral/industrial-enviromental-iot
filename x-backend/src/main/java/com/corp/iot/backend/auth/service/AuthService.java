package com.corp.iot.backend.auth.service;

import com.corp.iot.backend.auth.dto.ChangePasswordRequest;
import com.corp.iot.backend.auth.dto.MeResponse;
import com.corp.iot.backend.common.security.AppUserPrincipal;

public interface AuthService {

    LoginResult loginPlatform(String username, String password);

    LoginResult loginTenant(String username, String password);

    LoginResult refresh(String rawRefreshToken);

    void logout(String rawRefreshToken);

    MeResponse me(AppUserPrincipal principal);

    void changePassword(AppUserPrincipal principal, ChangePasswordRequest request);
}
