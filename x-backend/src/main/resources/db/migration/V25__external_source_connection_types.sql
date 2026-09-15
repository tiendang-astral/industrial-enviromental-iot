-- Mở rộng loại database ngoài. SQLSERVER có dialect từ bản này; MYSQL chỉ giữ chỗ để lúc thêm dialect
-- không phải viết migration mới. Loại dùng được thật do ExternalDbDialects (x-backend) quyết định.
ALTER TABLE external_source DROP CONSTRAINT ck_external_source_connection_type;

ALTER TABLE external_source
    ADD CONSTRAINT ck_external_source_connection_type
    CHECK (connection_type IN ('POSTGRESQL', 'SQLSERVER', 'MYSQL'));
