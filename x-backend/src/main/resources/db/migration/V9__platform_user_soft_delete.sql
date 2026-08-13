-- Cho phép tái sử dụng username sau khi platform_user bị soft-delete (deleted_at)
-- — trước đây unique index toàn cục không loại trừ user đã xóa (xem DATABASE.md
-- § platform_user).
DROP INDEX uq_platform_user_username;
CREATE UNIQUE INDEX uq_platform_user_username ON platform_user (lower(username)) WHERE deleted_at IS NULL;
