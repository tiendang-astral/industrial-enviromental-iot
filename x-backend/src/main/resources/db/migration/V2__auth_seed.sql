-- Seed data cần cho Phase 1 (Auth & multi-tenant RBAC).
-- tenant_role KHÔNG seed ở đây — mỗi tenant tự có bộ tenant_role riêng,
-- tạo động khi TenantService tạo tenant mới (xem Tenant creation flow).

INSERT INTO platform_role (name, value, created_at)
VALUES ('Platform Admin', 'PLATFORM_ADMIN', now());

-- Bootstrap account để đăng nhập lần đầu vào x-frontend-admin.
-- Username: admin / Password: ChangeMe123! (BCrypt cost 10) — đổi ngay sau khi login lần đầu.
INSERT INTO platform_user (username, full_name, email, password_hash, status, created_at, updated_at)
VALUES (
    'admin',
    'System Admin',
    'admin@example.com',
    '$2y$10$tNO/yXfQmsEuIhv7rRm0s.b3xHuDOUERxh.e6C.4FePTpEdC5M0zG',
    'ACTIVE',
    now(),
    now()
);
