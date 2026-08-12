package com.corp.iot.backend.common.scope;

import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import com.corp.iot.backend.userrolescope.entity.UserRoleScope;
import com.corp.iot.backend.userrolescope.repository.UserRoleScopeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Cache Redis {@code scope-sites:{tenant}:{user}} TTL 60s (theo DATABASE.md §5) —
 * Redis mất chỉ giảm hiệu năng (fallback query lại Postgres), không mất tính đúng đắn.
 */
@Service
@RequiredArgsConstructor
public class ScopeServiceImpl implements ScopeService {

    private static final Duration CACHE_TTL = Duration.ofSeconds(60);
    private static final String FULL_ACCESS_MARKER = "*";
    private static final String EMPTY_MARKER = "-";

    private final UserRoleScopeRepository userRoleScopeRepository;
    private final TenantNodeRepository tenantNodeRepository;
    private final StringRedisTemplate redisTemplate;

    @Override
    public Set<Long> resolveAccessibleNodeIds(Long tenantId, Long userId) {
        String key = "scope-sites:%d:%d".formatted(tenantId, userId);
        String cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            return deserialize(cached);
        }
        Set<Long> resolved = resolveFromDatabase(tenantId, userId);
        redisTemplate.opsForValue().set(key, serialize(resolved), CACHE_TTL);
        return resolved;
    }

    @Override
    public boolean canAccessNode(Long tenantId, Long userId, Long nodeId) {
        Set<Long> accessible = resolveAccessibleNodeIds(tenantId, userId);
        return accessible == null || accessible.contains(nodeId);
    }

    private Set<Long> resolveFromDatabase(Long tenantId, Long userId) {
        List<UserRoleScope> scopes = userRoleScopeRepository.findByUserId(userId);
        Set<Long> nodeIds = new HashSet<>();
        for (UserRoleScope scope : scopes) {
            if (scope.getTenantNodeId() == null) {
                return null;
            }
            nodeIds.addAll(tenantNodeRepository.findDescendantIdsIncludingSelf(tenantId, resolveNodePath(scope.getTenantNodeId())));
        }
        return nodeIds;
    }

    private String resolveNodePath(Long nodeId) {
        return tenantNodeRepository.findById(nodeId)
                .map(node -> node.getPath())
                .orElse(null);
    }

    private String serialize(Set<Long> nodeIds) {
        if (nodeIds == null) {
            return FULL_ACCESS_MARKER;
        }
        if (nodeIds.isEmpty()) {
            return EMPTY_MARKER;
        }
        return nodeIds.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private Set<Long> deserialize(String cached) {
        if (FULL_ACCESS_MARKER.equals(cached)) {
            return null;
        }
        if (EMPTY_MARKER.equals(cached)) {
            return Set.of();
        }
        return Arrays.stream(cached.split(",")).map(Long::valueOf).collect(Collectors.toSet());
    }
}
