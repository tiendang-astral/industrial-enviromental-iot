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

`PinTelemetryResponse`: `{ pinId, pinNumber, type, name, metricCode, unit, latestValue, latestMeasuredAt, bucketSeconds, history: [{ value, measuredAt }] }`.

**`history` luôn là dữ liệu đã gộp mẫu, không phải điểm thô.** Câu Flux chèn `aggregateWindow` với cửa sổ suy từ `rangeMinutes` (`AggregationWindow`, thang bậc cố định) để mỗi kênh luôn về ≤500 điểm — không có nó thì 7 ngày × 9 kênh ở chu kỳ 5 giây là hơn 1 triệu điểm trong một response. `bucketSeconds` là bề rộng cửa sổ đó (1h→10s, 6h→60s, 24h→180s, 7 ngày→1800s), để FE ghi rõ "mỗi điểm = trung bình N phút". Hàm gộp chọn theo metric: có `maxValue` → `max` (không giấu lần vượt ngưỡng), còn lại → `mean`. `latestValue` **không** bị gộp — nó đọc riêng bằng `last()`.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/external-sources/{id}/telemetry | Query `rangeMinutes` (optional, default 720, trần 10080) | `{ data: DatastreamTelemetryResponse[] }` | **Mới.** Số đo **mọi kênh của 1 nguồn** trong một lần gọi — trang tổng quan nguồn vẽ sparkline cho từng kênh, gọi lẻ sẽ thành N request cho một màn hình. Đọc InfluxDB `external_reading`, scope `@nodeScope.canAccessSource` |

`DatastreamTelemetryResponse`: `{ datastreamId, name, sourceField, metricCode, unit, latestValue, latestMeasuredAt, oldestReadingAt, bucketSeconds, history: [{ value, measuredAt }] }` — `history`/`bucketSeconds` gộp mẫu theo cùng luật với `PinTelemetryResponse` ở trên.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/datastreams/{id}/telemetry | Query `rangeMinutes` (optional, default 1440, trần 10080) | `{ data: DatastreamTelemetryResponse }` | Số đo của **đúng một kênh**, không cần biết phía sau là chân gateway hay câu SQL. Widget biểu đồ trên dashboard chỉ cầm `datastreamId`: kênh external nằm trên board đơn vị không tra ngược ra `external_source_id` (`datastream.source_id` là id của *job*), nên hai endpoint theo gateway/theo nguồn ở trên không phục vụ được nó. Scope `@nodeScope.canAccessDatastream` |

Lọc InfluxDB theo `(external_source_job_id, source_field)` chứ **không** theo `metric`: một job được phép có 2 kênh cùng metric ở 2 cột khác nhau, lọc theo metric sẽ trộn chúng làm một (xem `DATABASE.md` §4).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/datastreams/{id}/telemetry | Query `rangeMinutes` (optional, default 1440, trần 10080) | `{ data: DatastreamTelemetryResponse }` | **Mới.** Số đo của **đúng một kênh**, dùng chung cho cả `GATEWAY_PIN` lẫn `EXTERNAL_SOURCE_JOB`. Scope `@nodeScope.canAccessDatastream` |

Hai endpoint trên lấy theo lô (mọi chân của 1 gateway, mọi kênh của 1 nguồn) nên hợp với trang chi tiết. Widget biểu đồ trên dashboard thì ngược lại: nó chỉ cầm `datastreamId` và **không tra ngược ra được nguồn cha** — `datastream.sourceId` của kênh external là id của *job*, không phải của *external_source* — nên không gọi được endpoint theo nguồn. Đó là lý do endpoint theo kênh tồn tại chứ không phải để tiện.

Trả về **cùng một `DatastreamTelemetryResponse`** cho cả hai loại nguồn, đúng vai trò "điểm gặp" của `datastream` (xem `DATABASE.md` § datastream): nơi gọi chỉ hỏi "kênh này có số đo gì", không cần biết phía sau là chân gateway hay câu SQL. Kênh `GATEWAY_PIN` trả `sourceField = null` và `oldestReadingAt = null`. Kênh không tồn tại → 404 `DATASTREAM_NOT_FOUND`; kênh gateway mà chân đã bị xoá → 404 `PIN_NOT_FOUND`.

**`history` luôn đã gộp mẫu** theo cùng luật `AggregationWindow` với hai endpoint kia (≤500 điểm/kênh), nên phóng to ở giao diện **không** làm dữ liệu mịn thêm — muốn vậy phải cho endpoint nhận `from`/`to` thay vì `rangeMinutes`.

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
| GET | /api/v1/external-sources/{sourceId}/job-runs | Query `sinceHours` (mặc định 12) | `{ data: JobRunsResponse[] }` | **Mới.** Lịch sử chạy của **mọi job** thuộc nguồn trong 1 lần gọi — trang nguồn vẽ dải nhịp cho tất cả khối job cùng lúc, gọi lẻ theo từng job sẽ thành N request cho một màn hình. Scope `@nodeScope.canAccessSource` |
| DELETE | /api/v1/external-source-jobs/{id} | — | 200, no body | Soft delete; 409 `JOB_HAS_DATASTREAMS` nếu còn datastream gắn vào |

`ExternalSourceJobResponse`: `{ id, externalSourceId, name, queryConfig, scheduleCron, incrementalCursor, totalRowCount, lastRunStatus, lastRunAt, nextRunAt, lastError }`.

`ExternalSourceJobRunResponse`: `{ id, status, rowCount, error, startedAt, finishedAt }`.

`JobRunsResponse`: `{ jobId, runs: ExternalSourceJobRunResponse[] }` — job chưa chạy lần nào vẫn có mặt với `runs: []`, để FE phân biệt "chưa chạy" với "chưa tải xong" mà không cần cờ riêng.

`startFrom` ∈ `NEW_ONLY` (cursor = now, chỉ theo dõi từ giờ) | `ALL_HISTORY` (cursor = epoch, kéo hết lịch sử) | `FROM_DATE` (cần `startFromDate`, thiếu → 400 `START_DATE_REQUIRED`).

**Mã lỗi khi lưu job:**

| Code | Khi nào |
|------|---------|
| `MISSING_CURSOR_PLACEHOLDER` | `sql` không chứa `:cursor` — job sẽ đọc lại toàn bộ bảng mỗi lần chạy |
| `INVALID_QUERY` | Không bắt đầu bằng `SELECT`/`WITH`, hoặc có nhiều câu lệnh |
| `QUERY_FAILED` | Chạy thử hỏng — trả nguyên văn lỗi Postgres kèm vị trí |
| `TIMESTAMP_COLUMN_MISSING` | Kết quả không có cột `timestampColumn` |
| `BOUND_COLUMN_MISSING` | Truy vấn mới mất cột mà một `datastream` đang gắn — chặn để widget dashboard không chết âm thầm |

### Module: Alert Rule (`AlertRuleController`) — **Mới Phase 6a**

Rule cảnh báo theo metric tại một node. Quyền write `TENANT_ADMIN/MANAGER/OPERATOR` (Kỹ thuật viên xử lý cảnh báo — `PRODUCT.md`), `VIEWER` chỉ đọc. Scope theo node như module Gateway.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/alert-rules | Query `tenantNodeId` (optional), `includeDescendants` (optional, mặc định `false`) | `{ data: AlertRuleResponse[] }` | Không truyền `tenantNodeId` → toàn bộ rule trong scope user (giống `GET /gateways`); có truyền → đúng 1 node, `includeDescendants=true` lấy cả subtree |
| POST | /api/v1/alert-rules | `{ tenantNodeId, name, metricId, severity, conditions[], durationSeconds, channels[] }` | `{ data: AlertRuleResponse }` | Tạo rule + kênh nhận. `tenantNodeId` là **bất kỳ cấp node** — rule ở cấp trên phủ toàn bộ SITE bên dưới |
| PUT | /api/v1/alert-rules/{id} | `{ name, severity, conditions[], durationSeconds, channels[] }` | `{ data: AlertRuleResponse }` | Sửa + **REPLACE toàn bộ** `channels` (không merge, cùng quy ước `scopes[]` của tenant-user). Không cho đổi `tenantNodeId`/`metricId` — đổi thì là rule khác, tạo mới |
| PUT | /api/v1/alert-rules/{id}/status | `{ enabled }` | `{ data: AlertRuleResponse }` | Bật/tắt rule |
| DELETE | /api/v1/alert-rules/{id} | — | 200, no body | Soft delete (`deleted_at`, `V15`) + xoá `alert_channel`. Không xoá cứng để lịch sử `alert` không mồ côi `rule_id` |

`AlertRuleResponse`: `{ id, tenantNodeId, name, metricId, metricCode, metricUnit, severity, conditions, durationSeconds, enabled, channels: AlertChannelResponse[], createdAt, updatedAt }`.

`AlertChannelResponse`: `{ id, channelType, name, address, hasBotToken }` — **không** trả `telegramBotToken` dưới bất kỳ hình thức nào (bí mật, giống `credential` của `external_source`); `hasBotToken` để FE biết token đã có mà không lộ giá trị.

`conditions`: `{ logic, conditions: [{ operator, threshold }] }` — một nhóm MỘT tầng, `logic` ∈ `AND`/`OR`, `operator` ∈ `>` `>=` `<` `<=`. Bốn preset của UI ánh xạ vào đây và suy ngược lại được nên **không lưu tên preset**: Lớn hơn → `OR [> x]`; Nhỏ hơn → `OR [< x]`; Ngoài khoảng → `OR [< a, > b]`; Trong khoảng → `AND [>= a, <= b]`.

`channels[]` trong request: `[{ channelType, name?, address, telegramBotToken? }]` — `address` là email với `EMAIL`, `chat_id` với `TELEGRAM`. Bắt buộc `@NotEmpty`: rule không có kênh nào thì bắn xong chẳng ai biết, đúng loại "cấu hình chết" mà `scopes[]` cũng chặn. Service tự dedupe theo `(channelType, lower(address))` vì `uq_alert_channel` là `(alert_rule_id, channel_type, address)`.

**Mã lỗi:**

| Code | Khi nào |
|------|---------|
| `INVALID_CONDITION` | `operator` ngoài 4 giá trị cho phép, hoặc `threshold` null (400) |
| `TELEGRAM_TOKEN_REQUIRED` | Kênh `TELEGRAM` không có `telegramBotToken` — khớp `ck_alert_channel_telegram_token` (400) |
| `METRIC_NOT_FOUND` | `metricId` không tồn tại (400) |
| `NODE_NOT_FOUND` | `tenantNodeId` không tồn tại (404) |
| `ALERT_RULE_NOT_FOUND` | Rule không tồn tại hoặc đã xoá (404) |

> Các endpoint rule đơn lẻ ở trên vẫn còn nhưng **UI không dùng tới** — nó tạo/sửa qua nhóm. Giữ lại vì `alert_rule` là đơn vị engine thật sự đọc, và `alert.ruleId` trỏ vào đây.
>
> **Rule mới có hiệu lực ngay.** `x-processing-service` cache rule đã resolve trong Redis (`alert-rules:{tenantId}:{tenantNodeId}:{metricCode}`, TTL 60s). Mỗi lần ghi/xoá/bật-tắt rule, `x-backend` xoá key của **mọi node hậu duệ** của `rule.tenantNodeId` — không có bước này thì rule mới phải đợi hết TTL. Redis hỏng chỉ làm chậm hiệu lực, không sai kết quả.

### Module: Alert Rule Group (`AlertRuleGroupController`) — **Mới Phase 6b**

**Đường ghi chính của UI.** Người dùng nghĩ theo một việc ("theo dõi nhiệt độ và độ ẩm ở 3 chuồng"), engine lại cần mỗi rule gắn đúng 1 node + 1 metric. Nhóm giữ ý định, backend trải phẳng thành N×M `alert_rule` trong **một transaction** — hỏng giữa chừng thì không tạo dòng nào, khác hẳn để FE bắn N×M request rồi tự dọn khi lỗi.

Quyền write `TENANT_ADMIN/MANAGER/OPERATOR`, `VIEWER` chỉ đọc. Kiểm tra phạm vi **từng** đơn vị nằm trong service (một nhóm có nhiều đơn vị nên không dùng `@nodeScope` vốn nhận đúng một id).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/alert-rule-groups | — | `{ data: AlertRuleGroupResponse[] }` | Nhóm trong scope user. Nhóm mà **mọi** đơn vị đều ngoài phạm vi thì không hiện |
| POST | /api/v1/alert-rule-groups | `{ name, severity, sourceType?, tenantNodeIds[], metrics[], channels[] }` | `{ data: AlertRuleGroupResponse }` | Tạo nhóm + N×M rule con |
| PUT | /api/v1/alert-rule-groups/{id} | như POST | `{ data: AlertRuleGroupResponse }` | Sửa **theo kiểu đối chiếu**, không xoá-tạo-lại (xem ghi chú dưới) |
| PUT | /api/v1/alert-rule-groups/{id}/status | `{ enabled }` | `{ data: AlertRuleGroupResponse }` | Bật/tắt mọi rule con. **Tắt sẽ đóng luôn alert đang mở** của chúng sang `STALE` (không gửi thông báo) — engine không resolve rule đã tắt nên nếu không đóng, alert đứng im vĩnh viễn |
| DELETE | /api/v1/alert-rule-groups/{id} | — | 200, no body | Soft delete nhóm + mọi rule con, và đóng alert đang mở sang `STALE`. **Lịch sử alert được giữ nguyên** — báo cáo sự cố (Phase 8) dựa vào nó |

> **`tenantNodeIds[]` được thu gọn về mức cao nhất trước khi ghi.** Ô chọn tổ chức ở FE tick cha là tick luôn mọi con, mà rule vốn đã phủ toàn bộ subtree — giữ cả cha lẫn con sẽ tạo rule trùng và bắn hai cảnh báo cho một lần vi phạm. Vì vậy `ruleCount` và `tenantNodeIds` trong response có thể **ít hơn** số gửi lên. Phạm vi quyền vẫn kiểm tra trên **mọi** id gửi lên, kể cả id bị thu gọn.

`metrics[]`: `[{ metricId, conditions, durationSeconds }]` — mỗi chỉ số có ngưỡng và thời lượng riêng (form là một tab). Khai trùng `metricId` → 400 `DUPLICATE_METRIC`.

`AlertRuleGroupResponse`: `{ id, name, severity, sourceType, tenantNodeIds[], metricIds[], enabled, ruleCount, rules: GroupRuleResponse[], channels: AlertChannelResponse[], createdAt, updatedAt }`. `enabled` = mọi rule con đều bật. `GroupRuleResponse`: `{ id, tenantNodeId, metricId, metricCode, metricUnit, sourceType, conditions, durationSeconds, enabled }`.

`sourceType` ∈ `GATEWAY_PIN` | `EXTERNAL_SOURCE_JOB` | `null` (**mặc định — mọi nguồn**). Giới hạn quy tắc theo loại nguồn của kênh dữ liệu: một đơn vị có thể vừa có cảm biến trong chuồng vừa có nhiệt độ thời tiết từ database ngoài, cùng metric `temperature` nhưng khác bản chất. Nhóm chép giá trị này xuống mọi rule con (giống `severity`); rule tạo trước `V18` mang NULL nên hành vi không đổi.

> **Sửa nhóm không xoá rồi tạo lại.** Cặp (đơn vị, chỉ số) vẫn được chọn thì giữ nguyên `alert_rule.id`, chỉ cập nhật ngưỡng; cặp bị bỏ chọn mới xoá mềm. Xoá rồi tạo lại sẽ làm alert **đang mở** của rule đó mồ côi và không bao giờ chuyển được sang `RECOVERED`.

**Mã lỗi:** `DUPLICATE_METRIC` (400), `NODE_OUT_OF_SCOPE` (403), `NODE_NOT_FOUND` (404), `METRIC_NOT_FOUND` (400), `INVALID_CONDITION` (400), `TELEGRAM_TOKEN_REQUIRED` (400), `ALERT_RULE_GROUP_NOT_FOUND` (404).

### Module: Alert (`AlertController`) — **Mới Phase 6a**

Chỉ đọc — mọi chuyển trạng thái do `x-processing-service` ghi (xem `ARCHITECTURE.md` § Flow: Alert).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/alerts | Query `status` (optional), `tenantNodeId` (optional), `limit` (mặc định 500, trần 2000) | `{ data: AlertResponse[] }` | **N cảnh báo mới nhất** trong scope user, sắp `started_at` giảm dần. Không có bộ lọc khoảng thời gian: trang Cảnh báo sắp mới-nhất-trước rồi phân trang ở client, còn lọc trạng thái nằm ở ô lọc ngay trên cột. `status` giữ lại cho widget Dashboard chỉ cần alert đang mở — `OPEN` = `PENDING`+`ACTIVE` (khớp `uq_alert_open`), hoặc truyền thẳng `PENDING`/`ACTIVE`/`RECOVERED`. `tenantNodeId` lọc theo **subtree** node đó, giao với scope user |

> Lọc theo node nằm **trong** truy vấn chứ không lọc sau khi lấy về: cắt trần N dòng mới nhất rồi mới bỏ dòng ngoài phạm vi thì user scope hẹp sẽ nhận về gần như rỗng. Index `ix_alert_started (tenant_id, started_at DESC)` (`V17`) phục vụ trường hợp không lọc trạng thái — `ix_alert_recent` chỉ dùng được khi có `status`.

`AlertResponse`: `{ id, ruleId, ruleName, tenantNodeId, datastreamId, datastreamName, metricCode, metricUnit, status, severity, thresholdSnapshot (cùng shape `conditions`), lastObservedValue, lastObservedAt, startedAt, triggeredAt, recoveredAt }`. `status` ∈ `PENDING`/`ACTIVE`/`RECOVERED`/`STALE` (`STALE` = quy tắc bị tắt/xoá khi sự cố còn mở, xem `DATABASE.md` § alert). `thresholdSnapshot` là bản chụp `conditions` lúc alert mở — rule sửa sau đó không làm sai lịch sử. `ruleName` NULL nếu rule đã bị xoá mềm.

| Code | Khi nào |
|------|---------|
| `INVALID_ALERT_STATUS` | `status` không thuộc `OPEN`/`PENDING`/`ACTIVE`/`RECOVERED` (400) |

### Module: Dashboard (`DashboardController`)

Scope theo node như module Gateway ở trên. Mỗi user tối đa 1 board/node **hoặc** 1 board/nguồn (`uq_dashboard_user_node`, xem `DATABASE.md`).

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/tenant-nodes/{id}/dashboard | — | `{ data: DashboardResponse }` | Lấy board của user hiện tại tại node (`id` phải là node kiểu `SITE` từ Phase 5 — FE chỉ còn gọi endpoint này ở trang SITE) — tự tạo rỗng nếu chưa có |
| PUT | /api/v1/tenant-nodes/{id}/dashboard | `{ layoutJson }` | `{ data: DashboardResponse }` | Ghi đè toàn bộ layout (FE gửi full state **một lần khi người dùng bấm Lưu** — chế độ sửa là bản nháp cục bộ, không debounce theo từng cú kéo; xem `CONVENTIONS.md` § Dashboard layout) |
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

### Module: Report (`ReportController`) — **Mới Phase 8**

Hai báo cáo chạy **đồng bộ**: trả JSON để `x-frontend` render bảng + biểu đồ ngay trên màn hình, PDF
do trình duyệt tự kết xuất từ trang đó. Không có bảng hàng đợi, không worker, không MinIO, không
presigned URL — xem `ARCHITECTURE.md` § Flow: Report generation.

Quyền `TENANT_ADMIN/MANAGER/OPERATOR/**VIEWER**` — `PRODUCT.md` xếp "xem báo cáo" vào quyền Nhân
viên. Phạm vi đơn vị giao với scope user trong service (một báo cáo trải trên nhiều đơn vị nên không
dùng `@nodeScope` vốn nhận đúng một id), cùng cách `AlertController` làm.

| Method | Path | Body / Query | Response mẫu | Mô tả |
|--------|------|--------------|--------------|-------|
| GET | /api/v1/reports/environment | Query `from`, `to` (ISO-8601, bắt buộc), `tenantNodeIds`, `metricIds`, `gatewayIds`, `externalSourceIds` (optional, ngăn bằng dấu phẩy) | `{ data: EnvironmentReportResponse }` | Thống kê số đo theo từng kênh trong khoảng: min/max/trung bình/số điểm + lịch sử vẽ biểu đồ + số lần cảnh báo |
| GET | /api/v1/reports/incident | Query `from`, `to` (bắt buộc), `tenantNodeIds`, `gatewayIds`, `externalSourceIds`, `metricIds` (optional), `severity` (optional, `WARNING`\|`CRITICAL`) | `{ data: IncidentReportResponse }` | Danh sách sự cố bắt đầu trong khoảng + thống kê tần suất theo đơn vị và theo chỉ số |

Mọi danh sách lọc bỏ trống = **không lọc** chiều đó (toàn bộ trong phạm vi user) — vẫn là hành vi của API, dù form ở `x-frontend` bắt buộc người dùng chọn đơn vị và một chiều thu hẹp trước khi gửi. `severity` là khả năng của endpoint nhưng `x-frontend` không dùng: báo cáo luôn tính cả hai mức độ rồi tách con số ở phần thống kê từng nhóm. Mỗi `tenantNodeId`
lấy cả **subtree** rồi giao với scope, giống `GET /alerts`.

**Ba chiều thu hẹp ghép theo hai phép khác nhau: `(gatewayIds ∪ externalSourceIds) ∩ metricIds`.**
API nhận được cả ba cùng lúc, còn `x-frontend` hiện chỉ gửi **một** chiều mỗi lần (ô "Lọc theo" là
`Select` đơn) — giữ khả năng kết hợp ở API vì đây là ràng buộc dữ liệu, không phải ràng buộc UI.
`metricIds` áp cho **cả hai** báo cáo — với báo cáo sự cố nó quy về "kênh có chỉ số này" chứ không
join sang `alert_rule`, vì `alert.datastream_id` đã đủ để suy ra chỉ số.

**`gatewayIds` và `externalSourceIds` HỢP nhau, không giao nhau.** Một kênh chỉ có thể neo vào chân
gateway *hoặc* vào job của nguồn ngoài (`datastream.source_type`), nên giao hai tập luôn rỗng — truyền
cả hai nghĩa là "kênh của những gateway này **cộng** kênh của những nguồn này". Với báo cáo sự cố,
bộ lọc này quy về tập `datastream_id` rồi đưa **vào trong truy vấn**, không lọc sau khi lấy về: cắt
trần 5000 dòng mới nhất rồi mới bỏ dòng ngoài phạm vi thì bộ lọc hẹp sẽ trả về gần như rỗng.

Lưu ý `datastream.source_id` của kênh gateway là id của **pin**, không phải id gateway — backend
phải tra `gateway_pin` theo `gatewayIds` trước rồi mới khớp `source_id`.

`EnvironmentReportResponse`: `{ from, to, generatedAt, bucketSeconds, channels: EnvironmentChannelResponse[] }`.

`EnvironmentChannelResponse`: `{ datastreamId, datastreamName, tenantNodeId, tenantNodeName, metricCode, metricName, metricUnit, sampleCount, minValue, maxValue, avgValue, alertCount, history: [{ value, measuredAt }] }`.

`IncidentReportResponse`: `{ from, to, generatedAt, totalCount, incidents: IncidentResponse[], byNode: IncidentCountResponse[], byMetric: IncidentCountResponse[] }`.

`IncidentResponse`: `{ id, ruleId, ruleName, tenantNodeId, tenantNodeName, datastreamId, datastreamName, metricCode, metricName, metricUnit, severity, status, thresholdSnapshot, lastObservedValue, startedAt, triggeredAt, recoveredAt, durationSeconds }`. `durationSeconds` **null** = chưa kết thúc (còn `PENDING`/`ACTIVE`, hoặc `STALE` vì quy tắc bị tắt giữa chừng). `ruleName` null nếu rule đã xoá mềm.

`IncidentCountResponse`: `{ label, total, critical, warning }`, sắp giảm dần theo `total`.

> `x-frontend` không dùng `byNode`/`byMetric` của response này: nó tự gom `incidents` theo đúng chiều đang lọc (đơn vị / nguồn / gateway / chỉ số) để phần thống kê và phần biểu đồ chắc chắn cùng một cách chia. Hai mảng kia giữ lại vì là dạng tổng hợp sẵn cho nơi gọi khác.

**Ba điểm quyết định nội dung báo cáo:**

1. **`sampleCount`/`minValue`/`maxValue`/`avgValue` tính trên dữ liệu THÔ**, không phải trên chuỗi đã gộp mẫu — `history` mới là chuỗi gộp (`bucketSeconds` là bề rộng cửa sổ). Lấy min/max từ chuỗi đã trung bình hoá sẽ giấu mất chính lần vượt ngưỡng mà báo cáo sinh ra để chỉ tới.
2. **`alertCount` đếm từ bảng `alert`**, không tính lại từ InfluxDB. Tính lại vừa đắt vừa cho ra con số khác với cảnh báo đã thực sự bắn, và người đọc hai màn hình thấy hai số thì mất niềm tin vào cả hai. Hệ quả phải nói rõ trên UI: khoảng thời gian trước khi quy tắc được tạo hiện 0, không phải "không có vi phạm".
3. **Sự cố lọc theo `started_at`**, không theo khoảng giao nhau — một sự cố kéo dài qua ranh giới kỳ báo cáo chỉ được tính đúng một lần, ở kỳ nó bắt đầu.

**Mã lỗi:**

| Code | Khi nào |
|------|---------|
| `INVALID_RANGE` | `to <= from`, hoặc khoảng dài quá **366 ngày** (400) |
| `TOO_MANY_DATASTREAMS` | Quá **50 kênh** khớp bộ lọc — truy vấn chạy đồng bộ trong request thread (400) |
| `INVALID_SEVERITY` | `severity` không phải `WARNING`/`CRITICAL` (400) |
| `NODE_NOT_FOUND` | `tenantNodeIds` chứa id không tồn tại (404) |

> **Khoảng báo cáo bị giới hạn bởi retention của bucket `raw`.** Bảng routing bucket ở `DATABASE.md` §4 chưa dùng được: chỉ `raw` tồn tại thật, `downsampled_*` sinh ra từ job của Phase 9. `InfluxReadService.bucketFor(from, to)` hiện luôn trả `raw` và là chỗ duy nhất cần sửa khi các bucket kia có thật.

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

> Module Alert (Phase 6) và Report (Phase 8) đã có endpoint ở trên. Còn lại theo `PLAN.md`: Phase 9 (hardening) chưa thêm endpoint nào.
