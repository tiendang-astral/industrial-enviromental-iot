-- refresh_token ban đầu (V1) chỉ hỗ trợ tenant_user (tenant_id/user_id NOT NULL).
-- platform_user cũng cần refresh token (đăng nhập x-frontend-admin) — mở rộng
-- bảng dùng chung cho cả 2 loại user (đúng 1 trong 2 cột user NOT NULL).

ALTER TABLE refresh_token
    ALTER COLUMN tenant_id DROP NOT NULL,
    ALTER COLUMN user_id DROP NOT NULL,
    ADD COLUMN platform_user_id BIGINT REFERENCES platform_user (id);

ALTER TABLE refresh_token
    ADD CONSTRAINT ck_refresh_token_owner CHECK (
        (tenant_id IS NOT NULL AND user_id IS NOT NULL AND platform_user_id IS NULL)
        OR
        (tenant_id IS NULL AND user_id IS NULL AND platform_user_id IS NOT NULL)
    );

DROP INDEX ix_refresh_token_user;
DROP INDEX ix_refresh_token_active;

CREATE INDEX ix_refresh_token_user ON refresh_token (tenant_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX ix_refresh_token_user_active ON refresh_token (tenant_id, user_id) WHERE user_id IS NOT NULL AND revoked_at IS NULL;
CREATE INDEX ix_refresh_token_platform_user ON refresh_token (platform_user_id) WHERE platform_user_id IS NOT NULL;
CREATE INDEX ix_refresh_token_platform_user_active ON refresh_token (platform_user_id) WHERE platform_user_id IS NOT NULL AND revoked_at IS NULL;
