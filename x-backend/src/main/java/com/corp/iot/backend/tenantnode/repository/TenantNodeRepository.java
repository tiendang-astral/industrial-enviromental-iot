package com.corp.iot.backend.tenantnode.repository;

import com.corp.iot.backend.tenantnode.entity.TenantNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TenantNodeRepository extends JpaRepository<TenantNode, Long> {

    List<TenantNode> findAllByOrderByPathAsc();

    boolean existsByParentId(Long parentId);

    Optional<TenantNode> findByParentIdIsNull();

    /**
     * Thiết lập path/depth thật sau khi entity đã có id (chicken-egg của ltree
     * materialized path — không biết id trước khi insert).
     */
    @Modifying
    @Query(value = "UPDATE tenant_node SET path = CAST(:path AS ltree), depth = :depth WHERE id = :id",
            nativeQuery = true)
    void writePath(@Param("id") Long id, @Param("path") String path, @Param("depth") int depth);

    @Query(value = "SELECT id FROM tenant_node WHERE tenant_id = :tenantId AND path <@ CAST(:ancestorPath AS ltree)",
            nativeQuery = true)
    List<Long> findDescendantIdsIncludingSelf(@Param("tenantId") Long tenantId, @Param("ancestorPath") String ancestorPath);

    @Modifying
    @Query(value = "UPDATE tenant_node SET parent_id = :newParentId WHERE id = :id", nativeQuery = true)
    void updateParentId(@Param("id") Long id, @Param("newParentId") Long newParentId);

    /**
     * Re-parent: rebuild path/depth cho node bị move + toàn bộ subtree bên dưới trong 1 câu lệnh.
     * oldSelfDepthMinusOne = số label cần strip khỏi path cũ (= depth cũ của chính node bị move - 1),
     * giữ lại label của chính node đó trở xuống để nối vào path cha mới.
     */
    @Modifying
    @Query(value = """
            UPDATE tenant_node
            SET path = CAST(:newParentPath AS ltree) || subpath(path, :oldSelfDepthMinusOne),
                depth = depth + :depthDiff,
                updated_at = now()
            WHERE tenant_id = :tenantId AND path <@ CAST(:oldSelfPath AS ltree)
            """, nativeQuery = true)
    void moveSubtree(
            @Param("tenantId") Long tenantId,
            @Param("oldSelfPath") String oldSelfPath,
            @Param("oldSelfDepthMinusOne") int oldSelfDepthMinusOne,
            @Param("newParentPath") String newParentPath,
            @Param("depthDiff") int depthDiff
    );
}
