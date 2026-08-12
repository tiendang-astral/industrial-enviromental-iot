package com.corp.iot.backend.tenantnode.entity;

import com.corp.iot.backend.common.hibernate.LtreeJdbcType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcType;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.TenantId;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "tenant_node")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
public class TenantNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "parent_id")
    private Long parentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "node_type", nullable = false, updatable = false)
    private NodeType nodeType;

    @Column(nullable = false)
    private String name;

    // ltree không có mapping sẵn trong Hibernate — LtreeJdbcType custom (bind qua
    // PGobject) để vừa qua được ddl-auto=validate, vừa insert/update đúng giá trị.
    @JdbcType(LtreeJdbcType.class)
    @Column(nullable = false)
    private String path;

    @Column(nullable = false)
    private Integer depth;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
