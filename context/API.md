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

### Module: Tenant User (`TenantUserController`) — **Mới**

`@PreAuthorize("hasAuthority('TENANT_ADMIN')")` trên cả class — quản lý tài khoản và phân quyền là việc của Quản trị viên tenant; `MANAGER`/`OPERATOR`/`VIEWER` **không** đọc được danh sách (khác `TenantNodeController` nơi các vai trò kia còn được xem). Hibernate `@TenantId` trên `TenantUser`/`UserRoleScope`/`TenantRole` tự giới hạn mọi query trong tenant của người gọi nên không cần kiểm tra tenant thủ công.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/tenant-users | — | `{ data: TenantUserResponse[] }` | Toàn bộ user trong tenant (đã ẩn user soft-delete), sắp theo `username`, không phân trang |
| POST | /api/v1/tenant-users | `{ username, fullName, email?, password, scopes[] }` | `{ data: TenantUserResponse }` | Tạo user + `user_role_scope`. 409 `USERNAME_TAKEN` (kiểm tra chéo cả `platform_user` lẫn `tenant_user`, toàn platform); 400 `EMAIL_TAKEN`; 400 `ROLE_NOT_FOUND`/`NODE_NOT_FOUND` |
| PUT | /api/v1/tenant-users/{id} | `{ fullName, email?, scopes[] }` | `{ data: TenantUserResponse }` | Sửa hồ sơ + **REPLACE toàn bộ** `scopes` (không merge, cùng quy ước `alert_channel`). Không cho đổi `username`. 409 `LAST_TENANT_ADMIN` nếu bỏ vai trò `TENANT_ADMIN` của quản trị viên ACTIVE cuối cùng |
| PUT | /api/v1/tenant-users/{id}/status | `{ status }` (`ACTIVE`\|`LOCKED`) | `{ data: TenantUserResponse }` | Khóa/mở khóa; revoke toàn bộ refresh token khi `LOCKED`. 400 `SELF_ACTION_FORBIDDEN`; 409 `LAST_TENANT_ADMIN` |
| PUT | /api/v1/tenant-users/{id}/password | `{ newPassword }` | 200, no body | Quản trị viên đặt lại mật khẩu cho user khác (khác `PUT /auth/password` là user tự đổi và cần `currentPassword`). Revoke toàn bộ refresh token của user đó |
| DELETE | /api/v1/tenant-users/{id} | — | 200, no body | Soft delete (`deleted_at`) + xóa `user_role_scope` + revoke refresh token. 400 `SELF_ACTION_FORBIDDEN`; 409 `LAST_TENANT_ADMIN` |

`TenantUserResponse`: `{ id, username, fullName, email, status, createdAt, scopes: UserScopeResponse[] }`.

`UserScopeResponse`: `{ id, roleId, roleValue, roleName, tenantNodeId, tenantNodeName }` — `tenantNodeId` NULL = full-access toàn tenant (đúng ngữ nghĩa cột `user_role_scope.tenant_node_id`).

`scopes[]` trong request: `[{ roleId, tenantNodeId }]`, `tenantNodeId` nullable. Bắt buộc `@NotEmpty` — user không có role nào thì đăng nhập được nhưng không thấy gì, tạo ra tài khoản "chết" mà quản trị viên tưởng đã cấp quyền. Service tự dedupe trước khi ghi vì `uq_user_role_scope` là `(tenant_id, user_id, role_id, COALESCE(tenant_node_id, 0))`.

**Một user = MỘT vai trò, áp cho một hoặc nhiều đơn vị** — mọi phần tử `scopes[]` phải cùng `roleId`, khác nhau thì 400 `SINGLE_ROLE_ONLY`. Đây không phải ràng buộc thẩm mỹ: `AuthServiceImpl.resolveTenantAuthorities()` gộp phẳng vai trò thành `authorities` trong JWT và **bỏ phần đơn vị đi kèm**, còn `ScopeService` gộp phạm vi thành hợp của mọi node. Nếu cho nhiều vai trò ở các đơn vị khác nhau thì user dùng được vai trò cao nhất trên **toàn bộ** phạm vi — dữ liệu hứa một đằng, kiểm tra quyền làm một nẻo. Bảng `user_role_scope` vẫn giữ nhiều dòng (một dòng/đơn vị), chỉ khác là mọi dòng dùng chung `role_id`.

> **`TenantUser` nay có soft delete** — entity thêm `deleted_at` + `@SQLRestriction("deleted_at IS NULL")` (giống `PlatformUser` từ `V9`), nên user đã xóa biến mất khỏi mọi query entity-managed **kể cả luồng đăng nhập**. Không cần migration: cột đã có sẵn trong `V1__baseline_schema.sql`.
>
> Khác `platform_user`: `uq_tenant_user_username`/`uq_tenant_user_email` **không** partial theo `deleted_at`, nên user đã xóa mềm vẫn giữ chỗ username/email — kiểm tra trùng phải dùng native query đếm cả bản ghi đã xóa (`TenantUserRepository.usernameExistsPlatformWide`), vì query entity-managed vừa bị `@TenantId` giới hạn trong 1 tenant vừa bị `@SQLRestriction` lọc mất bản ghi đã xóa.

### Module: Tenant Role (`TenantRoleController`) — **Mới**

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/tenant-roles | — | `{ data: TenantRoleResponse[] }` | 4 vai trò của tenant hiện tại (`TENANT_ADMIN`/`MANAGER`/`OPERATOR`/`VIEWER`, seed lúc tạo tenant). `@PreAuthorize('TENANT_ADMIN')` — chỉ dùng để đổ dropdown trong form phân quyền |

`TenantRoleResponse`: `{ id, name, value }`. Khác `metric` (master data global chéo tenant), `tenant_role` được seed **riêng cho từng tenant** nên `@TenantId` lo phần lọc.

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
| GET | /api/v1/gateways | Query `tenantNodeId` (optional), `includeDescendants` (optional, mặc định `false`) | `{ data: GatewayResponse[] }` | Không truyền `tenantNodeId` → toàn bộ gateway trong scope user (trang "Thiết bị"); có truyền → theo đúng 1 Site (không phân trang). `includeDescendants=true` lấy cả subtree — widget `SWITCH` trên board ở node gộp cần tới (gateway chỉ gắn vào SITE) |
| POST | /api/v1/gateways | `{ tenantNodeId, name, macAddress }` | `{ data: GatewayResponse }` | Tạo — `tenantNodeId` bắt buộc, phải là node `SITE`; `macAddress` unique toàn platform |
| PUT | /api/v1/gateways/{id} | `{ name, macAddress?, tenantNodeId? }` | `{ data: GatewayResponse }` | Sửa tên và/hoặc MAC address (unique toàn platform, loại trừ chính gateway) và/hoặc Site (`tenantNodeId` mới phải là node `SITE`) — bỏ trống field nào thì giữ nguyên field đó |
| DELETE | /api/v1/gateways/{id} | — | 200, no body | Soft delete |

`GatewayResponse`: `{ id, tenantNodeId, name, macAddress, lastSeenAt }`.

### Module: Gateway Pin (`GatewayPinController`, nested dưới gateway)

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/gateways/{id}/pins | — | `{ data: GatewayPinResponse[] }` | List pin của gateway |
| POST | /api/v1/gateways/{id}/pins | `{ direction, type, name, metricId?, pinNumber }` | `{ data: GatewayPinResponse }` | Tạo pin, validate CHECK: INPUT⇒`metricId` bắt buộc; OUTPUT⇒`metricId` NULL |
| PUT | /api/v1/gateways/{id}/pins/{pinId} | `{ name?, enabled? }` | `{ data: GatewayPinResponse }` | Sửa tên/toggle enabled — chỉ 2 field này mutable (`type`/`pinNumber`/`metricId` gắn với phần cứng, đổi thì tạo pin mới) |
| DELETE | /api/v1/gateways/{id}/pins/{pinId} | — | 200, no body | **Xóa cứng** (bảng `gateway_pin` không có `deleted_at`) — xóa luôn `datastream` gắn vào pin (`sourceType=GATEWAY_PIN, sourceId=pinId`) trong cùng transaction, đúng invariant "1 gateway_pin → 1 datastream, lifecycle thuộc pin". 404 `PIN_NOT_FOUND` nếu pin không thuộc gateway. **Chưa dọn widget Dashboard đang bind datastream đó** — `layout_json` giữ nguyên `datastreamId` đã chết, xem ghi chú `DATABASE.md` § datastream |

`GatewayPinResponse`: `{ id, gatewayId, direction, type, name, metricId, pinNumber, powerDesiredState, powerReportedState, enabled }`.

### Module: Telemetry (`TelemetryController`)

Đọc InfluxDB — scope theo gateway như module Gateway ở trên (`@nodeScope.canAccessGateway`).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/gateways/{id}/telemetry | Query `rangeMinutes` (optional, default 60) | `{ data: PinTelemetryResponse[] }` | Giá trị mới nhất + lịch sử mỗi pin INPUT của gateway (đọc InfluxDB `sensor_reading`, bucket `raw`) |

`PinTelemetryResponse`: `{ pinId, pinNumber, type, name, metricCode, unit, latestValue, latestMeasuredAt, history: [{ value, measuredAt }] }`.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/external-sources/{id}/telemetry | Query `rangeMinutes` (optional, default 720, trần 10080) | `{ data: DatastreamTelemetryResponse[] }` | **Mới.** Số đo **mọi kênh của 1 nguồn** trong một lần gọi — trang tổng quan nguồn vẽ sparkline cho từng kênh, gọi lẻ sẽ thành N request cho một màn hình. Đọc InfluxDB `external_reading`, scope `@nodeScope.canAccessSource` |

`DatastreamTelemetryResponse`: `{ datastreamId, name, sourceField, metricCode, unit, latestValue, latestMeasuredAt, oldestReadingAt, history: [{ value, measuredAt }] }`.

Lọc InfluxDB theo `(external_source_job_id, source_field)` chứ **không** theo `metric`: một job được phép có 2 kênh cùng metric ở 2 cột khác nhau, lọc theo metric sẽ trộn chúng làm một (xem `DATABASE.md` §4).

### WebSocket (STOMP)

Endpoint `/ws` (không SockJS) — CONNECT header `Authorization: Bearer {accessToken}`. Subscribe `/topic/realtime/{tenantId}/{tenantNodeId}` để nhận reading mới realtime (payload xem `ARCHITECTURE.md` § Flow: Gateway sensor data). Chặn subscribe nếu `tenantId` không khớp JWT hoặc ngoài scope user (`ScopeService`). Một board có thể mở **nhiều** SUBSCRIBE trên cùng một kết nối — board ở node gộp bind kênh của nhiều site, mà mỗi site là một topic riêng.

### Module: Datastream (`DatastreamController`)

Scope theo node như module Gateway ở trên. `datastream` tự động sinh 1-1 khi tạo `gateway_pin` INPUT — không có endpoint tạo/xóa riêng.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/tenant-nodes/{id}/datastreams | Query `includeDescendants` (optional, mặc định `false`) | `{ data: DatastreamResponse[] }` | List datastream theo node. `includeDescendants=true` lấy cả subtree (ltree `path <@`) — board ở node gộp (BRANCH/PRODUCTION_AREA/TENANT_ROOT) cần tới vì `datastream` chỉ neo vào SITE, lọc đúng 1 node ở cấp trên luôn trả rỗng |
| PUT | /api/v1/datastreams/{id} | `{ name }` | `{ data: DatastreamResponse }` | Đổi tên datastream |

`DatastreamResponse`: `{ id, tenantNodeId, name, metricId, metricCode, metricUnit, sourceType, sourceId, sourceField, sourceGatewayId, sourcePinType, sourcePinNumber, sourceEnabled }`. `metricUnit` = đơn vị thật (VD `°C`) — dùng để hiện trên biểu đồ, khác `metricCode` (VD `temperature`) chỉ để so khớp logic. `sourceGatewayId`/`sourcePinType`/`sourcePinNumber` chỉ có khi `sourceType=GATEWAY_PIN` (denormalize để FE map `RealtimeReadingMessage` → đúng `datastreamId`). `sourceField` chỉ có khi `sourceType=EXTERNAL_SOURCE_JOB` — tên cột trong kết quả truy vấn của job mà datastream này bind vào. `oldestReadingAt` (`V13`) = mốc sớm nhất kênh có số đo liền mạch — FE hiện "Có số đo từ…" và dùng làm cận trên khi đọc lại lịch sử; NULL với `GATEWAY_PIN`. `sourceEnabled` = `gateway_pin.enabled` hiện tại — `false` khi pin bị tắt; **datastream không bị xóa khi tắt pin**, chỉ dừng nhận data, FE dùng field này để hiện badge "Pin đã tắt".

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/external-sources/{sourceId}/datastreams | — | `{ data: DatastreamResponse[] }` | List datastream thuộc 1 nguồn (join qua job) — dùng cho dialog "Thêm widget" ở dashboard theo nguồn |
| POST | /api/v1/external-source-jobs/{jobId}/datastreams | `{ name, metricId, sourceField, startFrom?, startFromDate? }` | `{ data: DatastreamResponse }` | Tạo datastream thủ công cho `external_source_job` (khác gateway_pin tự động) — `sourceField` phải là **cột thật trong kết quả truy vấn** của job (backend chạy thử để đối chiếu), 400 `INVALID_SOURCE_FIELD` nếu không có. `startFrom` (`V13`) chỉ có tác dụng khi job đã chạy (`lastRunAt != null`): khác `NEW_ONLY` thì xếp luôn một tác vụ vá lịch sử cho kênh vừa tạo |
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

#### Đọc trực tiếp database ngoài (`ExternalDbController`) — **Mới**

Ba endpoint mở JDBC thẳng tới database của nguồn, phục vụ luồng dựng job ở `x-frontend`. Mọi kết nối đặt `Connection.setReadOnly(true)` (Postgres bên kia tự từ chối lệnh ghi) + `statement_timeout` (`app.external.query-timeout-seconds`) + trần dòng (`app.external.preview-max-rows`). Quyền `TENANT_ADMIN/MANAGER/OPERATOR` — `VIEWER` **không** được chạy truy vấn tuỳ ý lên database khách hàng.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| POST | /api/v1/external-sources/test-connection | `{ connectionConfig, credential }` | `{ data: TestConnectionResponse }` | Thử kết nối **trước khi lưu** (form "Thêm nguồn" chưa có id). FE chặn nút Lưu tới khi `ok=true` |
| POST | /api/v1/external-sources/{id}/test-connection | — | `{ data: TestConnectionResponse }` | Thử lại nguồn đã lưu, dùng credential đã mã hoá trong DB |
| GET | /api/v1/external-sources/{id}/schema | — | `{ data: SchemaTable[] }` | Danh sách bảng + cột + kiểu dữ liệu (đọc `information_schema`), bỏ `pg_catalog`/`information_schema` |
| POST | /api/v1/external-sources/{id}/preview | `{ sql, timestampColumn }` | `{ data: PreviewResponse }` | Chạy thử truy vấn, trả tối đa `preview-max-rows` dòng. Bind `:cursor = epoch` — đúng bằng những dòng đầu tiên job sẽ đọc về. Chỉ đọc, không ghi Kafka/InfluxDB |

`TestConnectionResponse`: `{ ok, serverVersion, latencyMs, tableCount, writable, errorCode, errorMessage }`. `writable=true` → cảnh báo mềm "tài khoản có quyền ghi, nên dùng tài khoản chỉ đọc". `errorMessage` dịch sẵn theo SQLState (`28P01` sai mật khẩu, `3D000` database không tồn tại, `08006` không tới được máy chủ...) thay vì trả "thất bại" chung chung.

`SchemaTable`: `{ schema, name, estimatedRows, columns: SchemaColumn[] }`. `SchemaColumn`: `{ name, dataType, timestamp, numeric }`.

`PreviewResponse`: `{ columns: [{ name, dataType, numeric }], rows: any[][], rowCount, elapsedMs }`. Lỗi SQL → 400 `QUERY_FAILED` kèm thông báo Postgres nguyên văn; thiếu cột thời gian trong kết quả → 400 `TIMESTAMP_COLUMN_MISSING`; SQL không có `:cursor` → 400 `MISSING_CURSOR_PLACEHOLDER` (chạy thử cùng luật với lúc lưu, tránh cảnh "thử xanh, lưu đỏ").

#### Đọc lại lịch sử theo kênh (`ExternalSourceJobBackfillController`) — **Mới `V13`**

Kênh gắn sau khi job đã chạy sẽ thiếu phần lịch sử trước `incremental_cursor`. Ba endpoint dưới đây chạy lại **đúng câu SQL của job** trên khoảng còn thiếu, chỉ đổi giá trị bind vào `:cursor`. Quyền `TENANT_ADMIN/MANAGER/OPERATOR` + `@nodeScope.canAccessDatastream` — `VIEWER` chỉ đọc được tiến độ.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| POST | /api/v1/datastreams/{id}/backfill/estimate | `{ startFrom, startFromDate? }` | `{ data: BackfillEstimateResponse }` | Đếm trước khi chạy. Bọc câu SQL thành bảng con, gỡ `LIMIT` cuối câu rồi `count(*)`. Đếm quá `statement_timeout` → `rowCount = null` (vẫn chạy backfill được, chỉ là không có con số) |
| POST | /api/v1/datastreams/{id}/backfill | `{ startFrom, startFromDate? }` | `{ data: BackfillResponse }` | Xếp tác vụ `PENDING`; `x-ingestion-service` nhặt trong ≤10s. 409 `BACKFILL_IN_PROGRESS` nếu kênh đang có lượt chạy dở |
| GET | /api/v1/datastreams/{id}/backfill | — | `{ data: BackfillResponse \| null }` | Tác vụ gần nhất, `null` nếu chưa vá lần nào — FE poll để hiện tiến độ |

`BackfillEstimateResponse`: `{ rowCount, targetFrom, coveredFrom, elapsedMs }`.

`BackfillResponse`: `{ id, datastreamId, targetFrom, coveredFrom, cursorAt, status, rowCount, error, startedAt, finishedAt, progressPercent }`. `status` ∈ `PENDING`/`RUNNING`/`SUCCESS`/`FAILED`. `cursorAt` **giảm dần** từ `coveredFrom` về `targetFrom` (đọc mới → cũ, xem `ARCHITECTURE.md` § Flow: External source backfill); `progressPercent` tính theo khoảng thời gian đã lùi được.

`startFrom` dùng lại enum lúc tạo job: `ALL_HISTORY` (vá về epoch) | `FROM_DATE` (cần `startFromDate`) | `NEW_ONLY` → 400 `INVALID_START_FROM` (không có gì để đọc lại).

**Mã lỗi:**

| Code | Khi nào |
|------|---------|
| `BACKFILL_NOT_SUPPORTED` | Kênh có `sourceType=GATEWAY_PIN` — dữ liệu gateway do thiết bị đẩy lên, không đọc lại được |
| `NOTHING_TO_BACKFILL` | Mốc chọn không sớm hơn `oldestReadingAt` hiện có |
| `BACKFILL_IN_PROGRESS` | Kênh còn tác vụ `PENDING`/`RUNNING` (409) |
| `START_DATE_REQUIRED` | `FROM_DATE` mà thiếu `startFromDate` |

### Module: External Source Job (`ExternalSourceJobController`)

Scope theo `external_source` cha (cùng node scope ở trên).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| POST | /api/v1/external-sources/{sourceId}/jobs | `{ name, queryConfig: {sql, timestampColumn}, scheduleCron, startFrom, startFromDate? }` | `{ data: ExternalSourceJobResponse }` | Tạo — validate `sql` (`SqlQueryValidator`) + **backend tự chạy thử** trước khi ghi + parse `scheduleCron` bằng cron-utils |
| GET | /api/v1/external-sources/{sourceId}/jobs | — | `{ data: ExternalSourceJobResponse[] }` | List job của source |
| PUT | /api/v1/external-source-jobs/{id} | `{ name, queryConfig?, scheduleCron? }` | `{ data: ExternalSourceJobResponse }` | Sửa — chạy thử lại + đối chiếu cột đang gắn kênh; chỉ reset cursor về epoch khi đổi `timestampColumn` |
| POST | /api/v1/external-source-jobs/{id}/run-now | — | `{ data: ExternalSourceJobResponse }` | **Mới.** Kéo `next_run_at` về hiện tại; `x-ingestion-service` nhặt trong ≤15s (sweep). Không gọi RPC giữa service — đúng ranh giới ở `ARCHITECTURE.md` |
| GET | /api/v1/external-source-jobs/{id}/runs | Query `sinceHours` (mặc định 12) | `{ data: ExternalSourceJobRunResponse[] }` | **Mới.** Lịch sử chạy cho dải nhịp chạy; FE tự gom theo giờ cho biểu đồ số dòng |
| DELETE | /api/v1/external-source-jobs/{id} | — | 200, no body | Soft delete; 409 `JOB_HAS_DATASTREAMS` nếu còn datastream gắn vào |

`ExternalSourceJobResponse`: `{ id, externalSourceId, name, queryConfig, scheduleCron, incrementalCursor, totalRowCount, lastRunStatus, lastRunAt, nextRunAt, lastError }`.

`ExternalSourceJobRunResponse`: `{ id, status, rowCount, error, startedAt, finishedAt }`.

`startFrom` ∈ `NEW_ONLY` (cursor = now, chỉ theo dõi từ giờ) | `ALL_HISTORY` (cursor = epoch, kéo hết lịch sử) | `FROM_DATE` (cần `startFromDate`, thiếu → 400 `START_DATE_REQUIRED`).

**Mã lỗi khi lưu job:**

| Code | Khi nào |
|------|---------|
| `MISSING_CURSOR_PLACEHOLDER` | `sql` không chứa `:cursor` — job sẽ đọc lại toàn bộ bảng mỗi lần chạy |
| `INVALID_QUERY` | Không bắt đầu bằng `SELECT`/`WITH`, hoặc có nhiều câu lệnh |
| `QUERY_FAILED` | Chạy thử hỏng — trả nguyên văn lỗi Postgres kèm vị trí |
| `TIMESTAMP_COLUMN_MISSING` | Kết quả không có cột `timestampColumn` |
| `BOUND_COLUMN_MISSING` | Truy vấn mới mất cột mà một `datastream` đang gắn — chặn để widget dashboard không chết âm thầm |

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

### Module: Platform Dashboard (`PlatformDashboardController`)

`@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")` — chỉ System Admin. Dùng cho trang Dashboard của `x-frontend-admin` (tổng hợp cross-tenant, không có ở `x-frontend`).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/platform/dashboard/summary | — | `{ data: PlatformDashboardSummaryResponse }` | Tổng số `tenant_user` (không tính `platform_user`), tổng số `tenant`, tổng số `gateway` (toàn platform, kể cả gateway chưa gán Site) + top 5 tenant nhiều `tenant_user` nhất |
| GET | /api/v1/platform/dashboard/user-trend | Query `range` (`3d`\|`7d`\|`30d`, mặc định `7d`) | `{ data: TrendPointResponse[] }` | Tổng lũy kế `tenant_user` theo từng ngày trong khoảng chọn (carry-forward ngày không phát sinh mới); 400 `INVALID_RANGE` nếu `range` khác 3 giá trị trên |
| GET | /api/v1/platform/dashboard/tenant-trend | Query `range` (`3d`\|`7d`\|`30d`, mặc định `7d`) | `{ data: TrendPointResponse[] }` | Giống trên nhưng đếm `tenant` |

`PlatformDashboardSummaryResponse`: `{ totalTenantUsers, totalTenants, totalDevices, topTenants: [{ tenantId, tenantName, userCount }] }`.

`TrendPointResponse`: `{ date, value }` — `date` dạng `yyyy-MM-dd`, `value` là số lũy kế tính đến hết ngày đó.

Đếm `tenant_user`/`gateway` cross-tenant bắt buộc dùng native query bypass Hibernate `@TenantId` (System Admin không có `tenant_id`) — cùng pattern `GatewayRepository.macAddressExistsPlatformWide` đã có từ Phase 2 (xem `DATABASE.md`).

---

> Module Alert/Report (Phase 6/8) chưa có endpoint — cập nhật bảng tương ứng khi Phase đó implement, theo `PLAN.md`.
