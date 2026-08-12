package com.corp.iot.backend.userrolescope.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.TenantId;

@Entity
@Table(name = "user_role_scope")
@Getter
@Setter
@NoArgsConstructor
public class UserRoleScope {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "role_id", nullable = false)
    private Long roleId;

    @Column(name = "tenant_node_id")
    private Long tenantNodeId;

    public UserRoleScope(Long userId, Long roleId, Long tenantNodeId) {
        this.userId = userId;
        this.roleId = roleId;
        this.tenantNodeId = tenantNodeId;
    }
}
