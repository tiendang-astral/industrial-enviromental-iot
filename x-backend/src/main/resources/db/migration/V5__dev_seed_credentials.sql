-- Dev convenience seed — KHÔNG dùng cho production.
-- Đổi mật khẩu bootstrap platform_user (admin) sang 123456 (từ ChangeMe123!).
UPDATE platform_user
SET password_hash = '$2a$10$KOys.YhZd3Zx.KTNMM.KkOFPivMcw/ZBp/6f26ksNOpiFHnoTbqYm'
WHERE username = 'admin';

-- Seed 1 tenant demo + Tenant Admin (admin1/123456) để có sẵn tài khoản test cho
-- x-frontend mà không phải tạo tay qua x-frontend-admin mỗi lần reset DB.
-- Mirror đúng logic TenantServiceImpl.create() + TenantNodeServiceImpl.createRoot()
-- (4 tenant_role mặc định, user_role_scope full-access, TENANT_ROOT node).
DO $$
DECLARE
    new_tenant_id bigint;
    admin_role_id bigint;
    new_user_id bigint;
    root_node_id bigint;
BEGIN
    INSERT INTO tenant (name, email, status, created_at, updated_at)
    VALUES ('Demo Farm', 'demo@example.com', 'ACTIVE', now(), now())
    RETURNING id INTO new_tenant_id;

    INSERT INTO tenant_role (tenant_id, name, value, created_at) VALUES
        (new_tenant_id, 'Tenant Admin', 'TENANT_ADMIN', now()),
        (new_tenant_id, 'Manager', 'MANAGER', now()),
        (new_tenant_id, 'Operator', 'OPERATOR', now()),
        (new_tenant_id, 'Viewer', 'VIEWER', now());

    SELECT id INTO admin_role_id FROM tenant_role WHERE tenant_id = new_tenant_id AND value = 'TENANT_ADMIN';

    INSERT INTO tenant_user (tenant_id, username, full_name, email, password_hash, status, created_at, updated_at)
    VALUES (
        new_tenant_id,
        'admin1',
        'Tenant Admin',
        'admin1@example.com',
        '$2a$10$KOys.YhZd3Zx.KTNMM.KkOFPivMcw/ZBp/6f26ksNOpiFHnoTbqYm',
        'ACTIVE',
        now(),
        now()
    )
    RETURNING id INTO new_user_id;

    INSERT INTO user_role_scope (tenant_id, user_id, role_id, tenant_node_id)
    VALUES (new_tenant_id, new_user_id, admin_role_id, NULL);

    INSERT INTO tenant_node (tenant_id, parent_id, node_type, name, path, depth, created_at, updated_at)
    VALUES (new_tenant_id, NULL, 'TENANT_ROOT', 'Demo Farm', 'placeholder'::ltree, 1, now(), now())
    RETURNING id INTO root_node_id;

    UPDATE tenant_node SET path = (root_node_id::text)::ltree WHERE id = root_node_id;
END $$;
