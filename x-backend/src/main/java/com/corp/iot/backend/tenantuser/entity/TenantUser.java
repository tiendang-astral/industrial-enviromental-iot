package com.corp.iot.backend.tenantuser.entity;

import com.corp.iot.backend.common.enums.AccountStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.TenantId;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "tenant_user")
/*
 * Soft delete: user đã xoá phải biến mất khỏi MỌI query entity-managed, kể cả luồng đăng nhập
 * (findByUsernameIgnoreCase) — nếu không thì tài khoản đã xoá vẫn login được. Cùng cách
 * PlatformUser xử lý từ V9. Native query (Platform Dashboard) không bị @SQLRestriction chi phối
 * nên vẫn tự lọc "deleted_at IS NULL" bằng tay.
 */
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
public class TenantUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String username;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountStatus status = AccountStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
