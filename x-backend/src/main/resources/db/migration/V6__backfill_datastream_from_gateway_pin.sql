-- Backfill datastream cho gateway_pin INPUT đã tồn tại trước khi có tính năng Dashboard
-- (Phase 4) — từ migration này trở đi, GatewayPinServiceImpl.create() tự tạo datastream
-- cho mọi pin INPUT mới cùng transaction, script này chỉ chạy 1 lần cho dữ liệu cũ.
-- Bỏ qua pin thuộc gateway "mồ côi" (tenant_node_id NULL) vì datastream.tenant_node_id NOT NULL.
INSERT INTO datastream (tenant_id, tenant_node_id, name, metric_id, source_type, source_id, created_at, updated_at)
SELECT gp.tenant_id,
       g.tenant_node_id,
       g.name || ' - ' || gp.name,
       gp.metric_id,
       'GATEWAY_PIN',
       gp.id,
       now(),
       now()
FROM gateway_pin gp
JOIN gateway g ON g.id = gp.gateway_id
WHERE gp.direction = 'INPUT'
  AND g.tenant_node_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM datastream d WHERE d.source_type = 'GATEWAY_PIN' AND d.source_id = gp.id
  );
