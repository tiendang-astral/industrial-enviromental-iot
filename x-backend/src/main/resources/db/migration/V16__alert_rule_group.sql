-- Nhóm quy tắc cảnh báo (Phase 6b) — xem context/DATABASE.md § alert_rule_group.
--
-- Người dùng nghĩ theo một việc: "theo dõi nhiệt độ và độ ẩm ở 3 chuồng này". Engine lại cần mỗi
-- rule gắn đúng 1 node + 1 metric để resolve cho rẻ. `alert_rule_group` giữ ý định của người dùng,
-- `alert_rule` giữ dạng đã trải phẳng để engine dùng — form tạo 1 nhóm sinh ra N×M dòng con.
--
-- Không đụng gì tới đường chạy của engine: nó vẫn chỉ đọc `alert_rule`, không biết nhóm tồn tại.

CREATE TABLE alert_rule_group (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR NOT NULL,
    severity VARCHAR NOT NULL CHECK (severity IN ('WARNING', 'CRITICAL')),
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_alert_rule_group_tenant ON alert_rule_group (tenant_id, id);
CREATE INDEX ix_alert_rule_group_tenant ON alert_rule_group (tenant_id) WHERE deleted_at IS NULL;

-- NULL = rule đứng một mình (tạo qua endpoint rule đơn lẻ), vẫn hợp lệ với engine.
ALTER TABLE alert_rule
    ADD COLUMN group_id BIGINT,
    ADD CONSTRAINT fk_alert_rule_group FOREIGN KEY (tenant_id, group_id)
        REFERENCES alert_rule_group (tenant_id, id);

CREATE INDEX ix_alert_rule_group ON alert_rule (tenant_id, group_id) WHERE deleted_at IS NULL;

-- conditions_json đổi từ mảng phẳng [{operator,threshold}] sang {logic, conditions:[...]}:
-- preset "Trong khoảng" là `>= a AND <= b`, không biểu diễn được bằng mảng chỉ hiểu OR.
-- Cả 2 bảng đang rỗng nên không cần vá dữ liệu cũ.
UPDATE alert_rule
SET conditions_json = jsonb_build_object('logic', 'OR', 'conditions', conditions_json)
WHERE jsonb_typeof(conditions_json) = 'array';
