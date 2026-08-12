-- Baseline schema. Nguồn duy nhất cho DB schema (xem context/DATABASE.md).
-- Hibernate chạy ddl-auto=validate — không entity nào được tự sinh DDL.

CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- tenant
-- =====================================================================
CREATE TABLE tenant (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('ACTIVE', 'LOCKED')),
    settings_json JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- =====================================================================
-- platform_user
-- =====================================================================
CREATE TABLE platform_user (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR NOT NULL,
    full_name VARCHAR NOT NULL,
    email VARCHAR,
    password_hash VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED')),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_platform_user_username ON platform_user (lower(username));
CREATE UNIQUE INDEX uq_platform_user_email ON platform_user (lower(email)) WHERE email IS NOT NULL;

-- =====================================================================
-- tenant_user
-- username/email unique toàn cục theo DATABASE.md nhưng trải trên 2 bảng
-- (platform_user + tenant_user) — Postgres không thể ràng buộc unique
-- cross-table bằng index đơn thuần; tính duy nhất toàn cục kiểm tra ở
-- application layer (Phase 1), index dưới đây chỉ đảm bảo unique TRONG bảng.
-- =====================================================================
CREATE TABLE tenant_user (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant (id),
    username VARCHAR NOT NULL,
    full_name VARCHAR NOT NULL,
    email VARCHAR,
    password_hash VARCHAR NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('ACTIVE', 'LOCKED')),
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT,
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_tenant_user_username ON tenant_user (lower(username));
CREATE UNIQUE INDEX uq_tenant_user_email ON tenant_user (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uq_tenant_user_tenant ON tenant_user (tenant_id, id);
CREATE INDEX ix_user_status ON tenant_user (tenant_id, status);

-- =====================================================================
-- tenant_node — cây tổ chức TENANT_ROOT → BRANCH → PRODUCTION_AREA → SITE
-- Check thứ bậc cha/con: enforce ở application layer (Phase 2), CHECK
-- constraint đơn giản không truy được node_type của parent.
-- =====================================================================
CREATE TABLE tenant_node (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant (id),
    parent_id BIGINT,
    node_type VARCHAR NOT NULL CHECK (node_type IN ('TENANT_ROOT', 'BRANCH', 'PRODUCTION_AREA', 'SITE')),
    name VARCHAR NOT NULL,
    path LTREE NOT NULL,
    depth INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT,
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_tenant_node_tenant ON tenant_node (tenant_id, id);
ALTER TABLE tenant_node
    ADD CONSTRAINT fk_tenant_node_parent FOREIGN KEY (tenant_id, parent_id) REFERENCES tenant_node (tenant_id, id);
CREATE INDEX ix_tenant_node_path ON tenant_node USING GIST (path);

-- =====================================================================
-- refresh_token
-- =====================================================================
CREATE TABLE refresh_token (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant (id),
    user_id BIGINT NOT NULL REFERENCES tenant_user (id),
    token_hash VARCHAR NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX uq_refresh_token_hash ON refresh_token (token_hash);
CREATE INDEX ix_refresh_token_user ON refresh_token (tenant_id, user_id);
CREATE INDEX ix_refresh_token_active ON refresh_token (tenant_id, user_id) WHERE revoked_at IS NULL;

-- =====================================================================
-- platform_role / tenant_role / user_role_scope
-- =====================================================================
CREATE TABLE platform_role (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR NOT NULL,
    value VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX uq_platform_role_name ON platform_role (name);
CREATE UNIQUE INDEX uq_platform_role_value ON platform_role (value);

CREATE TABLE tenant_role (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant (id),
    name VARCHAR NOT NULL,
    value VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT
);
CREATE UNIQUE INDEX uq_tenant_role_value ON tenant_role (tenant_id, value);

CREATE TABLE user_role_scope (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant (id),
    user_id BIGINT NOT NULL REFERENCES tenant_user (id),
    role_id BIGINT NOT NULL REFERENCES tenant_role (id),
    tenant_node_id BIGINT REFERENCES tenant_node (id)
);
CREATE UNIQUE INDEX uq_user_role_scope ON user_role_scope (tenant_id, user_id, role_id, COALESCE(tenant_node_id, 0));
CREATE INDEX ix_scope_nodes ON user_role_scope (tenant_id, user_id);

-- =====================================================================
-- metric — master data, chia sẻ chéo tenant
-- =====================================================================
CREATE TABLE metric (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    unit VARCHAR NOT NULL,
    data_type VARCHAR NOT NULL CHECK (data_type IN ('NUMBER', 'BOOLEAN', 'STRING')),
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX uq_metric_code ON metric (code);

-- =====================================================================
-- gateway / gateway_pin
-- =====================================================================
CREATE TABLE gateway (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant (id),
    tenant_node_id BIGINT,
    name VARCHAR NOT NULL,
    mac_address VARCHAR(32) NOT NULL,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT,
    deleted_at TIMESTAMPTZ
);
ALTER TABLE gateway
    ADD CONSTRAINT fk_gateway_node FOREIGN KEY (tenant_id, tenant_node_id) REFERENCES tenant_node (tenant_id, id);
CREATE UNIQUE INDEX uq_gateway_mac ON gateway (mac_address);
CREATE UNIQUE INDEX uq_gateway_tenant ON gateway (tenant_id, id);
CREATE INDEX ix_gateway_node ON gateway (tenant_id, tenant_node_id);

CREATE TABLE gateway_pin (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    gateway_id BIGINT NOT NULL,
    direction VARCHAR NOT NULL CHECK (direction IN ('INPUT', 'OUTPUT')),
    type VARCHAR NOT NULL CHECK (type IN ('AI', 'DI', 'DO', 'AO')),
    name VARCHAR NOT NULL,
    metric_id BIGINT REFERENCES metric (id),
    pin_number INT NOT NULL,
    power_desired_state VARCHAR CHECK (power_desired_state IN ('ON', 'OFF')),
    power_reported_state VARCHAR CHECK (power_reported_state IN ('ON', 'OFF')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT,
    CONSTRAINT ck_gateway_pin_direction CHECK (
        (direction = 'INPUT' AND metric_id IS NOT NULL AND power_desired_state IS NULL AND power_reported_state IS NULL)
        OR
        (direction = 'OUTPUT' AND metric_id IS NULL)
    )
);
ALTER TABLE gateway_pin
    ADD CONSTRAINT fk_gateway_pin_gateway FOREIGN KEY (tenant_id, gateway_id) REFERENCES gateway (tenant_id, id) ON DELETE CASCADE;
CREATE UNIQUE INDEX uq_gateway_pin_tenant ON gateway_pin (tenant_id, id);
CREATE UNIQUE INDEX uq_gateway_pin ON gateway_pin (tenant_id, gateway_id, type, pin_number);

-- =====================================================================
-- external_source / external_source_job
-- =====================================================================
CREATE TABLE external_source (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant (id),
    tenant_node_id BIGINT NOT NULL,
    name VARCHAR NOT NULL,
    connection_type VARCHAR NOT NULL,
    connection_config JSONB NOT NULL,
    credential_encrypted TEXT NOT NULL,
    last_sync_status VARCHAR,
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT,
    deleted_at TIMESTAMPTZ
);
ALTER TABLE external_source
    ADD CONSTRAINT fk_external_source_node FOREIGN KEY (tenant_id, tenant_node_id) REFERENCES tenant_node (tenant_id, id);
CREATE UNIQUE INDEX uq_external_source_tenant ON external_source (tenant_id, id);

CREATE TABLE external_source_job (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    external_source_id BIGINT NOT NULL,
    name VARCHAR NOT NULL,
    query_config JSONB NOT NULL,
    filter_config JSONB,
    mapping_config JSONB,
    schedule_cron VARCHAR,
    incremental_field VARCHAR,
    incremental_cursor VARCHAR,
    total_row_count BIGINT NOT NULL DEFAULT 0,
    last_run_status VARCHAR CHECK (last_run_status IN ('RUNNING', 'SUCCESS', 'FAILED')),
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT,
    deleted_at TIMESTAMPTZ
);
ALTER TABLE external_source_job
    ADD CONSTRAINT fk_external_source_job_source FOREIGN KEY (tenant_id, external_source_id) REFERENCES external_source (tenant_id, id) ON DELETE CASCADE;
CREATE UNIQUE INDEX uq_external_source_job_tenant ON external_source_job (tenant_id, id);

-- =====================================================================
-- datastream — nguồn từ gateway_pin hoặc external_source_job
-- source_type/source_id là polymorphic reference — validate tại
-- application layer, không có FK DB-level (không có 1 bảng cha chung).
-- =====================================================================
CREATE TABLE datastream (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    tenant_node_id BIGINT NOT NULL,
    name VARCHAR NOT NULL,
    metric_id BIGINT NOT NULL REFERENCES metric (id),
    source_type VARCHAR NOT NULL CHECK (source_type IN ('GATEWAY_PIN', 'EXTERNAL_SOURCE_JOB')),
    source_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT
);
ALTER TABLE datastream
    ADD CONSTRAINT fk_datastream_node FOREIGN KEY (tenant_id, tenant_node_id) REFERENCES tenant_node (tenant_id, id);
CREATE UNIQUE INDEX uq_datastream_tenant ON datastream (tenant_id, id);
CREATE UNIQUE INDEX uq_datastream_name ON datastream (tenant_id, tenant_node_id, lower(name));

-- =====================================================================
-- dashboard / dashboard_template
-- =====================================================================
CREATE TABLE dashboard (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    tenant_node_id BIGINT,
    name VARCHAR NOT NULL,
    layout_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT
);
ALTER TABLE dashboard
    ADD CONSTRAINT fk_dashboard_user FOREIGN KEY (tenant_id, user_id) REFERENCES tenant_user (tenant_id, id);
ALTER TABLE dashboard
    ADD CONSTRAINT fk_dashboard_node FOREIGN KEY (tenant_id, tenant_node_id) REFERENCES tenant_node (tenant_id, id);
CREATE UNIQUE INDEX uq_dashboard_user_node ON dashboard (tenant_id, user_id, tenant_node_id);

CREATE TABLE dashboard_template (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    layout_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT
);

-- =====================================================================
-- alert_rule / alert_channel / alert
-- =====================================================================
CREATE TABLE alert_rule (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    tenant_node_id BIGINT NOT NULL,
    name VARCHAR NOT NULL,
    metric_id BIGINT NOT NULL REFERENCES metric (id),
    severity VARCHAR NOT NULL CHECK (severity IN ('WARNING', 'CRITICAL')),
    conditions_json JSONB NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT
);
ALTER TABLE alert_rule
    ADD CONSTRAINT fk_alert_rule_node FOREIGN KEY (tenant_id, tenant_node_id) REFERENCES tenant_node (tenant_id, id);
CREATE UNIQUE INDEX uq_alert_rule_tenant ON alert_rule (tenant_id, id);
CREATE INDEX ix_alert_rule_metric ON alert_rule (tenant_id, tenant_node_id, metric_id, enabled);

CREATE TABLE alert_channel (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    alert_rule_id BIGINT NOT NULL,
    channel_type VARCHAR NOT NULL CHECK (channel_type IN ('EMAIL', 'TELEGRAM')),
    name VARCHAR,
    address VARCHAR NOT NULL,
    telegram_bot_token VARCHAR,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_alert_channel_telegram_token CHECK (channel_type != 'TELEGRAM' OR telegram_bot_token IS NOT NULL)
);
ALTER TABLE alert_channel
    ADD CONSTRAINT fk_alert_channel_rule FOREIGN KEY (tenant_id, alert_rule_id) REFERENCES alert_rule (tenant_id, id) ON DELETE CASCADE;
CREATE UNIQUE INDEX uq_alert_channel ON alert_channel (alert_rule_id, channel_type, address);

CREATE TABLE alert (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    rule_id BIGINT NOT NULL,
    tenant_node_id BIGINT NOT NULL,
    datastream_id BIGINT,
    fingerprint VARCHAR NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'RECOVERED')),
    severity VARCHAR NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    triggered_at TIMESTAMPTZ,
    recovered_at TIMESTAMPTZ,
    last_observed_at TIMESTAMPTZ,
    last_observed_value DOUBLE PRECISION,
    threshold_snapshot_json JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE alert
    ADD CONSTRAINT fk_alert_rule FOREIGN KEY (tenant_id, rule_id) REFERENCES alert_rule (tenant_id, id);
ALTER TABLE alert
    ADD CONSTRAINT fk_alert_node FOREIGN KEY (tenant_id, tenant_node_id) REFERENCES tenant_node (tenant_id, id);
ALTER TABLE alert
    ADD CONSTRAINT fk_alert_datastream FOREIGN KEY (tenant_id, datastream_id) REFERENCES datastream (tenant_id, id);
CREATE UNIQUE INDEX uq_alert_open ON alert (tenant_id, fingerprint) WHERE status IN ('PENDING', 'ACTIVE');

-- =====================================================================
-- command — id/requested_by/gateway_id/tenant_id: xem ghi chú kiểu dữ
-- liệu đã sửa trong DATABASE.md (chỉ id là uuid, còn lại bigint khớp FK).
-- =====================================================================
CREATE TABLE command (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT NOT NULL REFERENCES tenant (id),
    gateway_id BIGINT NOT NULL,
    tenant_node_id BIGINT,
    command_type VARCHAR NOT NULL CHECK (command_type IN ('TURN_ON', 'TURN_OFF')),
    parameters_json JSONB NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'FAILED', 'TIMED_OUT')),
    requested_by BIGINT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL,
    dispatched_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ NOT NULL,
    correlation_id UUID,
    idempotency_key VARCHAR,
    retry_count INT NOT NULL DEFAULT 0,
    ack_payload_json JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE command
    ADD CONSTRAINT fk_command_gateway FOREIGN KEY (tenant_id, gateway_id) REFERENCES gateway (tenant_id, id);
CREATE UNIQUE INDEX uq_command_idempotency ON command (tenant_id, requested_by, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX ix_command_gateway ON command (tenant_id, gateway_id, requested_at DESC);
CREATE INDEX ix_command_status ON command (tenant_id, status, requested_at DESC);
CREATE INDEX ix_command_pending ON command (status, timeout_at) WHERE status IN ('PENDING', 'DISPATCHED');

-- =====================================================================
-- outbox_event — transactional outbox dùng chung, KHÔNG @TenantId
-- (publisher nền quét cross-tenant), nên tenant_id không có FK.
-- =====================================================================
CREATE TABLE outbox_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT NOT NULL,
    aggregate_type VARCHAR NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR NOT NULL,
    payload_json JSONB NOT NULL,
    correlation_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED')),
    attempt_count INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    last_error VARCHAR
);
CREATE INDEX ix_outbox_dispatch ON outbox_event (status, next_attempt_at, occurred_at) WHERE status IN ('PENDING', 'FAILED');
