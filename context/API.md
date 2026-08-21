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
| PUT | /api/v1/me | `{ fullName, email? }` | `{ data: MeResponse }` | **Mới.** User tự sửa hồ sơ của chính mình — dùng chung 2 app. Không cho đổi `username` (đã nằm trong JWT đang phát hành) và không cho đổi role/scope (thuộc quyền quản trị viên). `email` bỏ trống → lưu NULL; trùng email của tài khoản khác → 400 `EMAIL_TAKEN` (bắt `DataIntegrityViolationException` vì unique là toàn platform trong khi `TenantUser` gắn `@TenantId` nên query kiểm tra trước chỉ thấy trong 1 tenant) |

`MeResponse`: `{ id, username, fullName, email, type, tenantId, authorities: string[], organizationPath: string | null }` (`type` = `PLATFORM_USER`/`TENANT_USER`, `tenantId` NULL cho platform user). `organizationPath` chỉ có ở `tenant_user` — chuỗi "TênRoot → Tên2 → ... → TênNode hiện tại" build từ `tenant_node.path` theo scope (`user_role_scope`); nhiều scope thì nối bằng `"; "`; full-access (`tenant_node_id NULL`) hiện tên node TENANT_ROOT.

### Module: Tenant (`TenantController`)

`@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")` — chỉ System Admin.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| POST | /api/v1/tenants | `{ name, email, adminUsername, adminFullName, adminEmail?, adminPassword }` | `{ data: TenantResponse }` | Tạo tenant + 4 `tenant_role` mặc định + `tenant_user` admin + `user_role_scope` (1 lần gọi, transactional) |
| GET | /api/v1/tenants | — | `{ data: TenantResponse[] }` | Danh sách tenant |
| GET | /api/v1/tenants/{id} | — | `{ data: TenantDetailResponse }` | Chi tiết tenant: cây tổ chức + danh sách gateway + danh sách tenant_user. Query chéo tenant bằng cách set `TenantContext` tạm thời theo `{id}` (giống `TenantServiceImpl.create()`) |
| PUT | /api/v1/tenants/{id}/status | `{ status }` (`ACTIVE`\|`LOCKED`) | `{ data: TenantResponse }` | Activate/Deactivate tenant — `LOCKED` chặn toàn bộ `tenant_user` thuộc tenant đăng nhập/refresh (`AuthServiceImpl`) |

`TenantResponse`: `{ id, name, email, status, createdAt }`.

`TenantDetailResponse`: `{ tenant: TenantResponse, nodes: TenantNodeResponse[], gateways: GatewayResponse[], users: TenantUserSummaryResponse[] }`. `TenantUserSummaryResponse`: `{ id, username, fullName, email, status }`.

### Module: Platform User (`PlatformUserController`)

`@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")` — chỉ System Admin.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| POST | /api/v1/platform-users | `{ username, fullName, email?, password }` | `{ data: PlatformUserResponse }` | Tạo platform user |
| GET | /api/v1/platform-users | — | `{ data: PlatformUserResponse[] }` | Danh sách platform user (đã ẩn user soft-delete) |
| DELETE | /api/v1/platform-users/{id} | — | 200, no body | Soft delete (`deleted_at`); 400 `SELF_ACTION_FORBIDDEN` nếu `id` = chính mình; revoke toàn bộ refresh token của user đó |
| PUT | /api/v1/platform-users/{id}/status | `{ status }` (`ACTIVE`\|`LOCKED`) | `{ data: PlatformUserResponse }` | Activate/Deactivate; 400 `SELF_ACTION_FORBIDDEN` nếu `id` = chính mình; revoke refresh token khi chuyển `LOCKED` |

`PlatformUserResponse`: `{ id, username, fullName, email, status, createdAt }`.

### Module: Tenant Node (`TenantNodeController`)

Yêu cầu `tenant_user` đã login + scope theo node (custom `@PreAuthorize` SpEL, resolve qua `ScopeService` + cache Redis `scope-sites`). `TENANT_ADMIN` full quyền; `MANAGER`/`OPERATOR` chỉ đọc (không sửa cây tổ chức); `VIEWER` chỉ đọc.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/tenant-nodes | — | `{ data: TenantNodeResponse[] }` | Toàn bộ node trong scope user (flat list, FE tự dựng cây), không phân trang |
| POST | /api/v1/tenant-nodes | `{ parentId, nodeType, name }` | `{ data: TenantNodeResponse }` | Tạo node, validate hierarchy `TENANT_ROOT→BRANCH→PRODUCTION_AREA→SITE` |
| PUT | /api/v1/tenant-nodes/{id} | `{ name }` | `{ data: TenantNodeResponse }` | Đổi tên |
| PUT | /api/v1/tenant-nodes/{id}/move | `{ newParentId }` | `{ data: TenantNodeResponse }` | Re-parent, rebuild `path`/`depth` cho cả subtree |
| PUT | /api/v1/tenant-nodes/{id}/status | `{ enabled }` | `{ data: TenantNodeResponse }` | Activate/Deactivate — chỉ đổi cờ hiển thị + chặn tạo node con mới dưới node đã tắt, KHÔNG chặn luồng data/alert (ngoài phạm vi tenant-node, xem `x-processing-service` nếu cần) |
| DELETE | /api/v1/tenant-nodes/{id} | — | 200, no body | Soft delete; 409 `NODE_HAS_CHILDREN`/`NODE_HAS_DEPENDENCIES` nếu còn con hoặc gateway/external_source gắn vào |
| GET | /api/v1/tenant-nodes/{id}/overview | — | `{ data: TenantNodeOverviewResponse }` | **Mới — Phase 5.** Flatten toàn bộ subtree (ltree `path <@`) của node: tất cả `external_source` + tất cả node kiểu `SITE` bên dưới, bất kể sâu bao nhiêu cấp. FE dùng cho card-grid khi vào node không phải SITE (xem `ARCHITECTURE.md`/`DATABASE.md` § dashboard) |

`TenantNodeResponse`: `{ id, parentId, nodeType, name, path, depth, enabled }`.

`TenantNodeOverviewResponse`: `{ sources: [{ id, name, tenantNodeId, tenantNodePath }], sites: [{ id, name, path }] }`.

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
| PUT | /api/v1/gateways/{id} | `{ name, macAddress?, tenantNodeId? }` | `{ data: GatewayResponse }` | Sửa tên và/hoặc MAC address (unique toàn platform, loại trừ chính gateway) và/hoặc Site (`tenantNodeId` mới phải là node `SITE`) — bỏ trống field nào thì giữ nguyên field đó |
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

`DatastreamResponse`: `{ id, tenantNodeId, name, metricId, metricCode, metricUnit, sourceType, sourceId, sourceField, sourceGatewayId, sourcePinType, sourcePinNumber, sourceEnabled }`. `metricUnit` = đơn vị thật (VD `°C`) — dùng để hiện trên biểu đồ, khác `metricCode` (VD `temperature`) chỉ để so khớp logic. `sourceGatewayId`/`sourcePinType`/`sourcePinNumber` chỉ có khi `sourceType=GATEWAY_PIN` (denormalize để FE map `RealtimeReadingMessage` → đúng `datastreamId`). `sourceField` chỉ có khi `sourceType=EXTERNAL_SOURCE_JOB` — field trong `query_config.valueColumns` mà datastream này bind vào. `sourceEnabled` = `gateway_pin.enabled` hiện tại — `false` khi pin bị tắt; **datastream không bị xóa khi tắt pin**, chỉ dừng nhận data, FE dùng field này để hiện badge "Pin đã tắt".

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/external-sources/{sourceId}/datastreams | — | `{ data: DatastreamResponse[] }` | List datastream thuộc 1 nguồn (join qua job) — dùng cho dialog "Thêm widget" ở dashboard theo nguồn |
| POST | /api/v1/external-source-jobs/{jobId}/datastreams | `{ name, metricId, sourceField }` | `{ data: DatastreamResponse }` | Tạo datastream thủ công cho `external_source_job` (khác gateway_pin tự động) — `sourceField` phải khớp `query_config.valueColumns` của job |
| DELETE | /api/v1/datastreams/{id} | — | 200, no body | Chỉ cho phép khi `sourceType=EXTERNAL_SOURCE_JOB` — 400 nếu là `GATEWAY_PIN` (lifecycle vẫn thuộc gateway_pin) |

### Module: External Source (`ExternalSourceController`)

Scope theo node như module Gateway ở trên — khác Gateway, `tenantNodeId` có thể là **bất kỳ cấp** node (không riêng SITE). Quyền write `TENANT_ADMIN/MANAGER/OPERATOR` (Kỹ thuật viên cấu hình datasource — `PRODUCT.md`), `VIEWER` chỉ đọc.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/external-sources | — | `{ data: ExternalSourceResponse[] }` | Toàn bộ nguồn trong scope user, không giới hạn 1 node — dùng cho trang "Nguồn dữ liệu" (giống `GET /gateways` không truyền `tenantNodeId`) |
| POST | /api/v1/tenant-nodes/{nodeId}/external-sources | `{ name, connectionType: "POSTGRESQL", connectionConfig: {host, port, database, sslMode}, credential: {username, password} }` | `{ data: ExternalSourceResponse }` | Tạo, `credential` encrypt AES-GCM trước khi lưu |
| GET | /api/v1/tenant-nodes/{nodeId}/external-sources | — | `{ data: ExternalSourceResponse[] }` | List source gắn trực tiếp tại node |
| PUT | /api/v1/external-sources/{id} | `{ name?, connectionConfig?, credential? }` | `{ data: ExternalSourceResponse }` | Sửa — bỏ trống `credential` giữ nguyên (giống `UpdateGatewayRequest.macAddress`) |
| DELETE | /api/v1/external-sources/{id} | — | 200, no body | Soft delete; 409 `SOURCE_HAS_JOBS` nếu còn `external_source_job` |

`ExternalSourceResponse`: `{ id, tenantNodeId, name, connectionType, connectionConfig, lastSyncStatus, lastSyncAt, lastError }` — **không** trả `credential` dưới bất kỳ hình thức nào.

### Module: External Source Job (`ExternalSourceJobController`)

Scope theo `external_source` cha (cùng node scope ở trên).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| POST | /api/v1/external-sources/{sourceId}/jobs | `{ name, queryConfig: {table, timestampColumn, valueColumns[]}, filterConfig?: [{column, operator, value}], scheduleCron }` | `{ data: ExternalSourceJobResponse }` | Tạo — validate identifier allowlist + parse thử `scheduleCron` bằng cron-utils (400 nếu sai cú pháp) |
| GET | /api/v1/external-sources/{sourceId}/jobs | — | `{ data: ExternalSourceJobResponse[] }` | List job của source |
| PUT | /api/v1/external-source-jobs/{id} | `{ name?, queryConfig?, filterConfig?, scheduleCron? }` | `{ data: ExternalSourceJobResponse }` | Sửa — đổi `queryConfig`/`filterConfig`/`scheduleCron` → reset `incrementalCursor=null` |
| DELETE | /api/v1/external-source-jobs/{id} | — | 200, no body | Soft delete; 409 `JOB_HAS_DATASTREAMS` nếu còn datastream gắn vào |

`ExternalSourceJobResponse`: `{ id, externalSourceId, name, queryConfig, filterConfig, scheduleCron, incrementalCursor, totalRowCount, lastRunStatus, lastRunAt, nextRunAt, lastError }`.

### Module: Dashboard (`DashboardController`)

Scope theo node như module Gateway ở trên. Mỗi user tối đa 1 board/node **hoặc** 1 board/nguồn (`uq_dashboard_user_node`, xem `DATABASE.md`).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/tenant-nodes/{id}/dashboard | — | `{ data: DashboardResponse }` | Lấy board của user hiện tại tại node (`id` phải là node kiểu `SITE` từ Phase 5 — FE chỉ còn gọi endpoint này ở trang SITE) — tự tạo rỗng nếu chưa có |
| PUT | /api/v1/tenant-nodes/{id}/dashboard | `{ layoutJson }` | `{ data: DashboardResponse }` | Ghi đè toàn bộ layout (FE gửi full state sau debounce khi kéo-thả/resize) |
| GET | /api/v1/external-sources/{sourceId}/dashboard | — | `{ data: DashboardResponse }` | **Mới — Phase 5.** Board riêng theo nguồn — tự tạo rỗng nếu chưa có |
| PUT | /api/v1/external-sources/{sourceId}/dashboard | `{ layoutJson }` | `{ data: DashboardResponse }` | **Mới — Phase 5.** Ghi đè layout board theo nguồn |

`DashboardResponse`: `{ id, tenantNodeId, externalSourceId, name, widgets: [{ id, type, layout, title, binding, config }] }`. `type` ∈ `VALUE`/`LINE`/`DEVICE_COUNT`/`DEVICES_ONLINE`/`SWITCH` (`SWITCH` — Phase 7; `DEVICE_TABLE`/`EVENT_*` để phase sau, xem `PLAN.md`). `binding = { datastreamId }` cho `VALUE`/`LINE`; `binding = { gatewayId, pinId }` cho `SWITCH` (pin `OUTPUT`, không có `datastream`); `null` cho `DEVICE_COUNT`/`DEVICES_ONLINE`. Board theo nguồn (`externalSourceId != null`) chỉ cho phép `type` `VALUE`/`LINE` — không có khái niệm gateway/subtree để tổng hợp `DEVICE_COUNT`/`DEVICES_ONLINE`/`SWITCH`.

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

### Module: Command (`CommandController`, nested dưới gateway pin)

Scope theo gateway như module Gateway ở trên (`@nodeScope.canAccessGateway`) — chỉ cho pin `direction=OUTPUT` (`DO`/`AO`).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| POST | /api/v1/gateways/{gatewayId}/pins/{pinId}/commands | `{ commandType: "TURN_ON"\|"TURN_OFF", idempotencyKey }` | `{ data: CommandResponse }` | Tạo lệnh bật/tắt relay — 400 nếu pin không phải `OUTPUT`; trong 1 transaction ghi `command(status=PENDING)` + `outbox_event`; trùng `idempotencyKey` (cùng `requested_by`) → trả về `command` đã tồn tại thay vì tạo mới |

`CommandResponse`: `{ id, gatewayId, pinId, commandType, status, requestedAt, timeoutAt, error }`. `status` ∈ `PENDING`/`DISPATCHED`/`ACKNOWLEDGED`/`FAILED`/`TIMED_OUT` — cập nhật tiếp theo qua WebSocket, xem `ARCHITECTURE.md` § Flow Command.

---

> Module Alert/Report (Phase 6/8) chưa có endpoint — cập nhật bảng tương ứng khi Phase đó implement, theo `PLAN.md`.
