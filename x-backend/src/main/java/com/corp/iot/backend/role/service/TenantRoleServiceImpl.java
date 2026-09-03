package com.corp.iot.backend.role.service;

import com.corp.iot.backend.role.dto.TenantRoleResponse;
import com.corp.iot.backend.role.mapper.TenantRoleMapper;
import com.corp.iot.backend.role.repository.TenantRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantRoleServiceImpl implements TenantRoleService {

    private final TenantRoleRepository tenantRoleRepository;
    private final TenantRoleMapper tenantRoleMapper;

    @Override
    public List<TenantRoleResponse> list() {
        return tenantRoleRepository.findAll().stream().map(tenantRoleMapper::toResponse).toList();
    }
}
