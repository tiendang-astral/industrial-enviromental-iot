# API

## 1. Base URL

`/api/v1` — dùng chung cho `x-frontend` (tenant user) và `x-frontend-admin` (platform user). Backend tự phân biệt `platform_user`/`tenant_user` theo `username` khi login.

## 2. Response format

Một envelope duy nhất cho mọi response — `ApiResponse<T>` (`{ data, error }`), đúng 1 trong 2 field non-null:

Success:

```json
{ "data": {}, "error": null }
```

Lỗi — `@RestControllerAdvice` (`GlobalExceptionHandler`) trả cùng envelope qua `ApiResponse.error(code, message)`, kèm HTTP status tương ứng (`BusinessException.getStatus()`, hoặc 400 cho lỗi validate):

```json
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "username: must not be blank" } }
```

## 3. Endpoints

### Module: Auth (`PlatformAuthController`, `TenantAuthController`, `AuthController`, `MeController`)

> Login/refresh/logout tách namespace path riêng cho `x-frontend` (tenant) và `x-frontend-admin` (platform) — cookie `refresh_token` scope theo `Path`, không phân biệt port, nên nếu dùng chung 1 path thì mở cả 2 app trong cùng trình duyệt sẽ ghi đè cookie của nhau (bug thật gặp lúc dev, xem PLAN.md Phase 1).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| POST | /api/v1/tenant/auth/login | `{ username, password }` | `{ data: { accessToken, expiresIn, user: MeResponse } }` | Đăng nhập `tenant_user` (x-frontend). Set cookie `refresh_token` (httpOnly, `Path=/api/v1/tenant/auth`) |
| POST | /api/v1/tenant/auth/refresh | — (đọc cookie `refresh_token`) | `{ data: { accessToken, expiresIn, user } }` | Rotate refresh token (revoke cũ, set cookie mới) |
| POST | /api/v1/tenant/auth/logout | — (đọc cookie `refresh_token`) | 200, no body | Revoke refresh token, clear cookie |
| POST | /api/v1/platform/auth/login | `{ username, password }` | `{ data: { accessToken, expiresIn, user: MeResponse } }` | Đăng nhập `platform_user` (x-frontend-admin). Set cookie `refresh_token` (httpOnly, `Path=/api/v1/platform/auth`) |
| POST | /api/v1/platform/auth/refresh | — (đọc cookie `refresh_token`) | `{ data: { accessToken, expiresIn, user } }` | Rotate refresh token (revoke cũ, set cookie mới) |
| POST | /api/v1/platform/auth/logout | — (đọc cookie `refresh_token`) | 200, no body | Revoke refresh token, clear cookie |
| PUT | /api/v1/auth/password | `{ currentPassword, newPassword }` | 200, no body | Đổi mật khẩu — dùng chung 2 app (điều khiển bởi Bearer JWT, không phụ thuộc cookie nên không cần tách path), revoke toàn bộ refresh token khác của user |
| GET | /api/v1/me | — (JWT) | `{ data: MeResponse }` | Profile user hiện tại |

`MeResponse`: `{ id, username, fullName, email, type, tenantId, authorities: string[] }` (`type` = `PLATFORM_USER`/`TENANT_USER`, `tenantId` NULL cho platform user).

### Module: Tenant (`TenantController`)

`@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")` — chỉ System Admin.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| POST | /api/v1/tenants | `{ name, email, adminUsername, adminFullName, adminEmail?, adminPassword }` | `{ data: TenantResponse }` | Tạo tenant + 4 `tenant_role` mặc định + `tenant_user` admin + `user_role_scope` (1 lần gọi, transactional) |
| GET | /api/v1/tenants | — | `{ data: TenantResponse[] }` | Danh sách tenant |

`TenantResponse`: `{ id, name, email, status, createdAt }`.

### Module: Platform User (`PlatformUserController`)

`@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")` — chỉ System Admin.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| POST | /api/v1/platform-users | `{ username, fullName, email?, password }` | `{ data: PlatformUserResponse }` | Tạo platform user |
| GET | /api/v1/platform-users | — | `{ data: PlatformUserResponse[] }` | Danh sách platform user |

`PlatformUserResponse`: `{ id, username, fullName, email, status, createdAt }`.

### Module: Tenant Node (`TenantNodeController`)

Yêu cầu `tenant_user` đã login + scope theo node (custom `@PreAuthorize` SpEL, resolve qua `ScopeService` + cache Redis `scope-sites`). `TENANT_ADMIN` full quyền; `MANAGER`/`OPERATOR` chỉ đọc (không sửa cây tổ chức); `VIEWER` chỉ đọc.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/tenant-nodes | — | `{ data: TenantNodeResponse[] }` | Toàn bộ node trong scope user (flat list, FE tự dựng cây), không phân trang |
| POST | /api/v1/tenant-nodes | `{ parentId, nodeType, name }` | `{ data: TenantNodeResponse }` | Tạo node, validate hierarchy `TENANT_ROOT→BRANCH→PRODUCTION_AREA→SITE` |
| PUT | /api/v1/tenant-nodes/{id} | `{ name }` | `{ data: TenantNodeResponse }` | Đổi tên |
| PUT | /api/v1/tenant-nodes/{id}/move | `{ newParentId }` | `{ data: TenantNodeResponse }` | Re-parent, rebuild `path`/`depth` cho cả subtree |
| DELETE | /api/v1/tenant-nodes/{id} | — | 200, no body | Soft delete; 409 `NODE_HAS_CHILDREN`/`NODE_HAS_DEPENDENCIES` nếu còn con hoặc gateway/external_source gắn vào |

`TenantNodeResponse`: `{ id, parentId, nodeType, name, path, depth }`.

### Module: Metric (`MetricController`)

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/metrics | — | `{ data: MetricResponse[] }` | Master data metric (system, chéo tenant), không phân trang |

`MetricResponse`: `{ id, code, name, unit, dataType, minValue, maxValue }`.

### Module: Gateway (`GatewayController`)

Scope theo node như Tenant Node ở trên.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/gateways | Query `tenantNodeId` (optional) | `{ data: GatewayResponse[] }` | Không truyền `tenantNodeId` → toàn bộ gateway trong scope user (trang "Thiết bị"); có truyền → theo đúng 1 Site (không phân trang) |
| POST | /api/v1/gateways | `{ tenantNodeId, name, macAddress }` | `{ data: GatewayResponse }` | Tạo — `tenantNodeId` bắt buộc, phải là node `SITE`; `macAddress` unique toàn platform |
| PUT | /api/v1/gateways/{id} | `{ name }` | `{ data: GatewayResponse }` | Sửa tên |
| DELETE | /api/v1/gateways/{id} | — | 200, no body | Soft delete |

`GatewayResponse`: `{ id, tenantNodeId, name, macAddress, lastSeenAt }`.

### Module: Gateway Pin (`GatewayPinController`, nested dưới gateway)

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/gateways/{id}/pins | — | `{ data: GatewayPinResponse[] }` | List pin của gateway |
| POST | /api/v1/gateways/{id}/pins | `{ direction, type, name, metricId?, pinNumber }` | `{ data: GatewayPinResponse }` | Tạo pin, validate CHECK: INPUT⇒`metricId` bắt buộc; OUTPUT⇒`metricId` NULL |
| PUT | /api/v1/gateways/{id}/pins/{pinId} | `{ name?, enabled? }` | `{ data: GatewayPinResponse }` | Sửa tên/toggle enabled — không có endpoint xóa (bảng không có `deleted_at`, pin gắn cố định với hardware) |

`GatewayPinResponse`: `{ id, gatewayId, direction, type, name, metricId, pinNumber, powerDesiredState, powerReportedState, enabled }`.

### Module: Telemetry (`TelemetryController`)

Đọc InfluxDB — scope theo gateway như module Gateway ở trên (`@nodeScope.canAccessGateway`).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/gateways/{id}/telemetry | Query `rangeMinutes` (optional, default 60) | `{ data: PinTelemetryResponse[] }` | Giá trị mới nhất + lịch sử mỗi pin INPUT của gateway (đọc InfluxDB `sensor_reading`, bucket `raw`) |

`PinTelemetryResponse`: `{ pinId, pinNumber, type, name, metricCode, unit, latestValue, latestMeasuredAt, history: [{ value, measuredAt }] }`.

### WebSocket (STOMP)

Endpoint `/ws` (không SockJS) — CONNECT header `Authorization: Bearer {accessToken}`. Subscribe `/topic/realtime/{tenantId}/{tenantNodeId}` để nhận reading mới realtime (payload xem `ARCHITECTURE.md` § Flow: Gateway sensor data). Chặn subscribe nếu `tenantId` không khớp JWT hoặc ngoài scope user (`ScopeService`).

### Module: Datastream (`DatastreamController`)

Scope theo node như module Gateway ở trên. `datastream` tự động sinh 1-1 khi tạo `gateway_pin` INPUT — không có endpoint tạo/xóa riêng.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/tenant-nodes/{id}/datastreams | — | `{ data: DatastreamResponse[] }` | List datastream theo node |
| PUT | /api/v1/datastreams/{id} | `{ name }` | `{ data: DatastreamResponse }` | Đổi tên datastream |

`DatastreamResponse`: `{ id, tenantNodeId, name, metricId, metricCode, metricUnit, sourceType, sourceId, sourceGatewayId, sourcePinType, sourcePinNumber, sourceEnabled }`. `metricUnit` = đơn vị thật (VD `°C`) — dùng để hiện trên biểu đồ, khác `metricCode` (VD `temperature`) chỉ để so khớp logic. `sourceGatewayId`/`sourcePinType`/`sourcePinNumber` chỉ có khi `sourceType=GATEWAY_PIN` (denormalize để FE map `RealtimeReadingMessage` → đúng `datastreamId`). `sourceEnabled` = `gateway_pin.enabled` hiện tại — `false` khi pin bị tắt; **datastream không bị xóa khi tắt pin**, chỉ dừng nhận data, FE dùng field này để hiện badge "Pin đã tắt".

### Module: Dashboard (`DashboardController`)

Scope theo node như module Gateway ở trên. Mỗi user tối đa 1 board/node (`uq_dashboard_user_node`).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/tenant-nodes/{id}/dashboard | — | `{ data: DashboardResponse }` | Lấy board của user hiện tại tại node — tự tạo rỗng nếu chưa có |
| PUT | /api/v1/tenant-nodes/{id}/dashboard | `{ layoutJson }` | `{ data: DashboardResponse }` | Ghi đè toàn bộ layout (FE gửi full state sau debounce khi kéo-thả/resize) |

`DashboardResponse`: `{ id, tenantNodeId, name, widgets: [{ id, type, layout, title, binding, config }] }`. `type` ∈ `VALUE`/`LINE`/`DEVICE_COUNT`/`DEVICES_ONLINE` (đợt 1 — `SWITCH`/`DEVICE_TABLE`/`EVENT_*` để phase sau, xem `PLAN.md`). `binding = { datastreamId }` cho `VALUE`/`LINE`, `null` cho 2 loại còn lại.

### Module: Dashboard Template (`DashboardTemplateController`)

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/dashboard-templates | — | `{ data: DashboardTemplateResponse[] }` | List template (global, chéo tenant, giống Metric) |
| POST | /api/v1/tenant-nodes/{id}/dashboard/apply-template/{templateId} | — | `{ data: DashboardResponse }` | Query `datastream` theo `metric` khớp template tại node, sinh widget cho từng datastream khớp, **append** vào dashboard hiện có của user (dedupe theo `type`+`datastreamId`, không ghi đè widget cũ) |

`DashboardTemplateResponse`: `{ id, name, description, layoutJson }`.

### Module: Device Stats

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/tenant-nodes/{id}/devices | — | `{ data: DeviceSummaryResponse[] }` | Danh sách gateway trong subtree của node (path ltree), kèm trạng thái online — dùng cho widget DEVICE_LIST/DEVICES_ONLINE (FE tự đếm total/online/offline từ list này) |

`DeviceSummaryResponse`: `{ id, name, macAddress, lastSeenAt, online }`. `online` = `last_seen_at` trong ngưỡng cấu hình (`app.device.online-threshold-minutes`, mặc định 5').

---

> Các module còn lại (External source ở Phase 5, Alert/Command/Report ở Phase 6-8) chưa có endpoint — cập nhật bảng tương ứng khi Phase đó implement, theo `PLAN.md`.
