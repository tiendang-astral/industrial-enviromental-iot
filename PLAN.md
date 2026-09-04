# Plan triển khai

> Roadmap triển khai theo từng chức năng, dựa trên `context/PRODUCT.md`, `context/ARCHITECTURE.md`, `context/DATABASE.md`, `context/TECHSTACK.md`, `context/CONVENTIONS.md`. 5 project: `x-frontend/` (tenant user), `x-frontend-admin/` (platform user — System Admin), `x-backend/`, `x-ingestion-service/`, `x-processing-service/`.
>
> Mỗi Phase dưới đây là 1 **chức năng/nhóm chức năng độc lập, có thể demo được**. Khi bắt đầu 1 Phase, tạo spec + implementation plan chi tiết riêng (theo `superpowers:brainstorming` → `superpowers:writing-plans`, TDD, bite-sized task) — file này chỉ là bản đồ tổng, không thay cho plan chi tiết từng task.

## Nguyên tắc thứ tự

- Phase sau phụ thuộc dữ liệu/hạ tầng của Phase trước (VD: không có `tenant_node` thì không tạo được `gateway`; không có `datastream` thì Dashboard không có gì để bind).
- Trong mỗi Phase, Backend (CRUD/API) luôn đi trước Frontend (UI dùng API đó), trừ khi ghi chú khác.
- 3 service backend (`x-backend`, `x-ingestion-service`, `x-processing-service`) độc lập về code (không `common` module) nhưng phối hợp qua Kafka/Redis/PostgreSQL chung — Phase liên quan tới pipeline data sẽ đụng tới nhiều hơn 1 service.

## Tổng quan Phase

| Phase | Chức năng | Service chính |
|-------|-----------|----------------|
| 0 | Hạ tầng & scaffolding | Tất cả |
| 1 | Auth & multi-tenant RBAC | x-backend, x-frontend, x-frontend-admin |
| 2 | Quản trị tổ chức (tenant_node) & Gateway/Pin | x-backend, x-frontend |
| 3 | Ingestion MQTT → InfluxDB (luồng sensor) | x-ingestion-service, x-processing-service |
| 4 | Dashboard & Realtime hiển thị | x-backend, x-frontend |
| 5 | External source polling | x-ingestion-service, x-processing-service |
| 6 | Alert engine (đa kênh) | x-processing-service, x-backend |
| 7 | Command / Relay control | x-frontend, x-backend, x-processing-service |
| 8 | Report generation | x-backend, x-processing-service |
| 9 | Hardening & Deployment | Tất cả |

---

## Phase 0 — Hạ tầng & scaffolding

**Mục tiêu:** Có đủ hạ tầng chạy local (docker-compose) và 5 project khởi tạo được, build/run rỗng thành công trước khi viết logic nghiệp vụ.

**Nhiệm vụ chính:**
- [x] `docker-compose.yml`: PostgreSQL 16, Redis 7, InfluxDB 2.x, MinIO, EMQX, Kafka (KRaft, không cần Zookeeper).
- [x] `x-backend/`: khởi tạo Spring Boot 4.x (Java 21+, nâng từ 3.x — start.spring.io chỉ còn hỗ trợ 4.x, xem quyết định trong TECHSTACK.md), Spring Data JPA, Spring Security, Spring WebSocket, Flyway. Cấu trúc theo `CONVENTIONS.md` (`com.corp.iot.backend`).
- [x] `x-ingestion-service/`: khởi tạo Spring Boot, Spring Integration MQTT (Paho), Spring Kafka. Chưa cần Postgres write, chỉ cần Redis + Kafka producer.
- [x] `x-processing-service/`: khởi tạo Spring Boot, Spring Kafka consumer, Spring Data JPA, InfluxDB client.
- [x] `x-frontend/`: khởi tạo React + Vite, Tailwind + shadcn/ui, React Router, TanStack Query, Zustand, Axios instance với interceptor JWT (chưa có token thật).
- [x] `x-frontend-admin/`: khởi tạo React + Vite, Tailwind + shadcn/ui, React Router, TanStack Query, Axios (giống `x-frontend` nhưng nhẹ hơn — không cần ECharts/react-grid-layout/socket.io-client vì không có dashboard/realtime).
- [x] Flyway `V1__baseline_schema.sql`: tạo toàn bộ bảng theo `DATABASE.md` (chưa cần seed). Nhân đó sửa 2 lỗi kiểu dữ liệu phát hiện khi viết DDL (`command`/`outbox_event.tenant_id` phải `bigint` khớp FK `tenant.id`, không phải `uuid`) — đã cập nhật `DATABASE.md`.
- [x] Kafka topics: tạo `sensor-data-raw`, `external-data-raw`, `gateway-commands` bằng script (`scripts/create-kafka-topics.sh`, idempotent).
- [x] `scripts/up.sh` + `scripts/down.sh`: start/stop toàn bộ app (hạ tầng docker compose + service) cho local dev.

**DoD:**
- [x] `docker compose up` chạy đủ 6 service hạ tầng, health check OK.
- [x] `x-backend` chạy `GET /actuator/health` trả 200 với DB Postgres đã connect qua Flyway (22 bảng tạo đúng, bao gồm `flyway_schema_history`).
- [x] 3 service Spring Boot khác build & start thành công (chưa cần logic — `x-ingestion-service`/`x-processing-service` start rồi tự thoát ngay do chưa có listener/thread nào giữ JVM sống, đúng như kỳ vọng ở scaffold rỗng).
- [x] `x-frontend` chạy `npm run dev`, render 1 trang trống (build production cũng pass: `npm run build`).
- [x] `x-frontend-admin` chạy `npm run dev`, render 1 trang trống (build production cũng pass: `npm run build`).

---

## Phase 1 — Auth & multi-tenant RBAC

**Chức năng PRODUCT.md:** "Quản trị theo tenant" (phần định danh/đăng nhập), vai trò người dùng (mục 5).

**Service:** x-backend, x-frontend, x-frontend-admin.

**Bảng liên quan:** `tenant`, `platform_user`, `tenant_user`, `refresh_token`, `platform_role`, `tenant_role`, `user_role_scope`.

**Nhiệm vụ chính:**
- [x] Flyway seed: `platform_role` (`PLATFORM_ADMIN`) + bootstrap `platform_user` (`admin`/`ChangeMe123!`) ở `V2__auth_seed.sql`. `tenant_role` mẫu (`TENANT_ADMIN`, `MANAGER`, `OPERATOR`, `VIEWER`) tạo **động** mỗi khi System Admin tạo tenant mới (không seed tĩnh, vì mỗi tenant cần bộ role riêng).
- [x] `V5__dev_seed_credentials.sql` (Phase 2, dev-only convenience): đổi mật khẩu `admin` sang `123456`; seed thêm 1 tenant "Demo Farm" + Tenant Admin `admin1`/`123456` (mirror đúng logic `TenantServiceImpl.create()` + `TenantNodeServiceImpl.createRoot()` bằng raw SQL) — để có sẵn login tenant test mà không phải tạo tay qua x-frontend-admin mỗi lần reset DB. Đồng thời hạ giới hạn độ dài mật khẩu tối thiểu từ 8 xuống 6 ký tự (`ChangePasswordRequest`/`CreateTenantRequest`/`CreatePlatformUserRequest` + zod schema tương ứng ở cả 2 frontend).
- [x] Entity + Repository cho các bảng trên (Hibernate `@TenantId` DISCRIMINATOR cho `tenant_user`/`tenant_role`/`user_role_scope`; `refresh_token` không dùng `@TenantId` — bảng dùng chung tenant/platform, lookup trực tiếp qua `token_hash`). Nhân đó sửa `refresh_token` (`V3__refresh_token_platform_user.sql`) để hỗ trợ cả `platform_user` (cột `platform_user_id` mới, `tenant_id`/`user_id` thành NULLABLE) — cập nhật `DATABASE.md`.
- [x] API: đăng nhập (`platform_user` hoặc `tenant_user`, BCrypt), issue JWT access (jjwt, HS256) + refresh token opaque (SHA-256 hash lưu DB, raw value qua httpOnly cookie), refresh token rotation (revoke cũ + insert mới), logout (revoke).
- [x] (Phase 2 follow-up) **Tách namespace path login/refresh/logout** thành `PlatformAuthController` (`/api/v1/platform/auth/*`, cookie `Path=/api/v1/platform/auth`) và `TenantAuthController` (`/api/v1/tenant/auth/*`, cookie `Path=/api/v1/tenant/auth`) — ban đầu dùng chung 1 API `/api/v1/auth/*` như ARCHITECTURE.md mô tả, nhưng phát hiện bug thật lúc dev: cookie `refresh_token` scope theo Path chứ không phân biệt port, nên mở cả `x-frontend` (5173) và `x-frontend-admin` (5174) trong cùng trình duyệt sẽ ghi đè cookie của nhau — app nào refresh sau sẽ "cướp" session app kia (refresh trả 200 nhưng đúng session của app kia, gọi API tiếp theo bị 403). `AuthService.login()` tách thành `loginPlatform()`/`loginTenant()` (không tự detect username nữa, mỗi path chỉ nhận đúng loại user). `PUT /auth/password` giữ chung path cũ vì chạy qua Bearer JWT, không phụ thuộc cookie nên không bị đụng độ.
- [x] `JwtAuthenticationFilter`: validate JWT mỗi request, set `tenant_id` vào `TenantContext` (ThreadLocal, dùng cho Hibernate `CurrentTenantIdentifierResolver`) + `Authentication` (authorities) vào security context.
- [x] Resolve scope: `user_role_scope` → `tenant_role.value` (trực tiếp qua repository, chưa cache Redis `scope-sites` — để lúc query theo `tenant_node_id` thật ở Phase 2 mới cần cache, hiện tại là lookup rẻ theo user_id) — chưa cần `tenant_node` thật, `tenant_node_id` luôn NULL ở Phase này.
- [x] `@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")` trên `TenantController`/`PlatformUserController` — verify: tenant user gọi vào bị 403.
- [x] API quản lý `platform_user`/`tenant`/`tenant_user` (CRUD cơ bản) — `POST /tenants` tạo tenant + 4 `tenant_role` + `tenant_user` admin + `user_role_scope` trong 1 lần gọi (transactional theo từng bước, xem code comment trong `TenantServiceImpl`).
- [x] `GET /api/v1/me` — trả profile user hiện tại (id, username, full_name, email, type, tenant_id, authorities).
- [x] `PUT /api/v1/auth/password` — đổi mật khẩu: verify mật khẩu cũ (BCrypt), hash mật khẩu mới, revoke toàn bộ `refresh_token` khác của user (buộc thiết bị khác đăng nhập lại, gồm cả session hiện tại — FE phải tự logout sau khi đổi thành công).
- [x] x-frontend + x-frontend-admin: cài `sonner` (toast lỗi network/5xx + thông báo thành công).
- [x] x-frontend + x-frontend-admin: `AppShell` (Sidebar+Header+Main từ shadcn/ui primitives — không dùng block `sidebar-07` có sẵn vì dư team-switcher/projects-nav), `UserMenu` (Thông tin tài khoản/Đổi mật khẩu/Đăng xuất), `LoginPage`, route guard redirect `/login` khi chưa auth (silent `POST .../auth/refresh` lúc app boot để giữ session qua refresh trang), `stores/useAuthStore.ts` (Zustand, in-memory), `queries/`: `useLoginMutation`, `useLogoutMutation`, `useMeQuery`, `useChangePasswordMutation`.
- [x] x-frontend + x-frontend-admin (Phase 2 follow-up): `httpClient` response interceptor tự động `POST .../auth/refresh` (đúng path riêng theo app) + retry request gốc khi gặp lỗi auth (thay vì request treo/im lặng lúc access token hết hạn giữa phiên) — bắt cả 401 **và 403** (JWT thiếu/hết hạn ở backend thực tế trả 403, không phải 401, do Spring Security 6 coi request anonymous là AccessDenied — verify bằng Playwright set access-token TTL 1 phút, đợi hết hạn, thấy request treo ở "Đang tải..." trước khi sửa). Dedupe nhiều request lỗi cùng lúc chỉ gọi refresh 1 lần (`refreshInFlight`); refresh thất bại → clear session, route guard tự đẩy về `/login`. Đăng ký callback cập nhật/xóa session qua `registerAuthCallbacks()` (tránh import vòng giữa `httpClient.ts` và `useAuthStore.ts`).
- [x] x-frontend: Sidebar đủ menu theo roadmap (Tổng quan, Tổ chức, Nguồn dữ liệu, Cảnh báo, Báo cáo) — item chưa làm disable + badge "Sắp có".
- [x] x-frontend-admin: Sidebar 2 mục thật — trang CRUD `tenant` (tạo tenant kèm Tenant Admin đầu tiên), trang CRUD `platform_user`.

**DoD:**
- [x] Login trả JWT hợp lệ, refresh token rotation hoạt động (verify qua curl: refresh 2 lần, token cũ trả 401 khi dùng lại).
- [x] `@PreAuthorize` chặn đúng theo role trên `/tenants`/`/platform-users` (tenant user → 403).
- [x] x-frontend-admin: System Admin tạo tenant + Tenant Admin từ UI (verify API path qua curl: `POST /tenants` → tenant_role×4 + tenant_user + user_role_scope đúng `tenant_id`; UI code reviewed, `npm run build` pass).
- [x] x-frontend: login bằng Tenant Admin thành công (verify qua API), AppShell/Sidebar/Topbar/UserMenu code reviewed, `npm run build` pass. Route guard + silent refresh giữ session qua reload.
- [x] Đổi mật khẩu thành công ở UserMenu (verify qua curl: đổi xong, mật khẩu cũ login 401, mật khẩu mới login 200; phát hiện và fix 1 bug thật — thiếu `@Transactional` làm bulk-revoke refresh token lỗi 403/500).

---

## Phase 2 — Quản trị tổ chức & Gateway/Pin

**Chức năng PRODUCT.md:** "Quản trị theo tenant: Công ty → Chi nhánh → Khu sản xuất → Xưởng/Chuồng trại".

**Service:** x-backend, x-frontend.

**Bảng liên quan:** `tenant_node` (ltree), `gateway`, `gateway_pin`, `metric`.

**Nhiệm vụ chính:**
- [x] CRUD `tenant_node` với ràng buộc thứ bậc `TENANT_ROOT → BRANCH → PRODUCTION_AREA → SITE` (validate ở service layer, DB không tự enforce được), tự tính `path`/`depth` (ltree, 2 bước insert-rồi-update vì chưa biết `id` trước khi insert), composite FK `(tenant_id, parent_id)`. Có thêm `PUT /tenant-nodes/{id}/move` (re-parent, rebuild `path`/`depth` cho cả subtree bằng 1 câu `UPDATE ... WHERE path <@ ...`, chặn cycle) — quyết định làm luôn trong Phase 2 thay vì để sau.
- [x] Xóa node còn con hoặc còn `gateway` gắn vào → chặn cứng 409 (`NODE_HAS_CHILDREN`/`NODE_HAS_DEPENDENCIES`), không cascade (quyết định đã chốt).
- [x] Hoàn thiện scope resolve ở Phase 1: `ScopeService` dùng GiST index trên `tenant_node.path` (`path <@ ...`) để lấy node con trong scope khi `tenant_node_id` không NULL, cache Redis `scope-sites:{tenant}:{user}` TTL 60s (lần đầu Redis thực sự được dùng trong code, hạ tầng có sẵn từ Phase 0 nhưng chưa ai viết `RedisConfig`). Custom `@PreAuthorize` SpEL bean `@nodeScope.canAccess(...)`/`canAccessGateway(...)` — pattern mới so với role-based thuần ở Phase 1.
- [x] Flyway seed `metric` (`V4__phase2_metric_seed.sql`): temperature, humidity, pressure, pm25, co2, light, voltage, current, power.
- [x] CRUD `gateway` (unique `mac_address` toàn platform — phải dùng native query bypass `@TenantId` vì Hibernate tự thêm `AND tenant_id=?`, nếu không sẽ bỏ sót MAC trùng ở tenant khác; bắt buộc gán `tenantNodeId` là 1 node `SITE` ngay lúc tạo, không cho "mồ côi"), CRUD `gateway_pin` (validate CHECK INPUT/OUTPUT ở service layer trước khi insert; không có endpoint xóa pin vì bảng không có `deleted_at` — chỉ create/update tên+enabled).
- [x] `TenantServiceImpl.create()` tự tạo `TENANT_ROOT` node kèm tenant mới (gap từ Phase 1 phát hiện khi code Phase 2).
- [x] x-frontend: trang "Tổ chức" — **bảng thụt lề theo `depth` + icon theo `node_type`** (không dùng tree-view kéo-thả riêng theo yêu cầu, giữ đơn giản/nhất quán với `Table` shadcn đã có), hành động (Thêm con/Đổi tên/Di chuyển/Xóa) hiện thẳng button icon trong cột thay vì gom vào dropdown menu (đổi lại theo yêu cầu, ban đầu làm dropdown); trang quản lý Gateway + danh sách Pin theo ngữ cảnh 1 Site (`SiteDetailPage`, `/organization/sites/:siteId`). **(cập nhật sau này)** `SiteDetailPage` đã bị bỏ — quản lý gateway/pin gom hết về trang "Thiết bị" (`/devices`) và trang chi tiết thiết bị (`/devices/:gatewayId`, `GatewayDetailPage`); trang "Tổ chức" chỉ còn quản lý cây node, không còn route con theo Site.
- [x] (follow-up) Trang "Thiết bị" (`/devices`) — danh sách **toàn bộ** gateway trong scope user (không giới hạn theo 1 Site), kèm tên Site/lần cuối online, action Sửa/Xóa hiện thẳng button. `GET /gateways` sửa `tenantNodeId` thành optional — không truyền thì `GatewayServiceImpl` tự lọc theo `ScopeService.resolveAccessibleNodeIds()` (cùng pattern với `TenantNodeServiceImpl.list()`) thay vì query theo 1 node cụ thể.

**DoD:**
- [x] Tạo được cây tổ chức 4 cấp, move node rebuild đúng `path`/`depth` cho cả subtree, xóa node cha còn con → 409 (verify qua curl: tạo `TENANT_ROOT→BRANCH→PRODUCTION_AREA→SITE`, move `SITE` sang nhánh khác, thử move `BRANCH` vào chính `SITE` con của nó → 400 `NODE_MOVE_CYCLE`).
- [x] Tạo gateway + pin, validate đúng CHECK constraint (INPUT phải có `metric_id`, OUTPUT phải có `pin_number` và không có `metric_id`) — verify qua curl đủ các case hợp lệ/không hợp lệ.
- [x] `user_role_scope` với `tenant_node_id` cụ thể chỉ thấy được node con của nó — verify bằng 2 user khác scope thật (TENANT_ADMIN full-access vs MANAGER giới hạn 1 `BRANCH`): user scoped chỉ thấy đúng subtree trong `GET /tenant-nodes`, tạo gateway ở node ngoài scope → 403; xác nhận Redis cache `scope-sites` được ghi đúng (`redis-cli GET`).
- [x] x-frontend build (`npm run build`) pass + verify UI thật qua Playwright (browser thật, không chỉ typecheck): login → xem cây tổ chức đúng thụt lề/icon → mở dialog tạo node → tạo thành công → node mới hiện đúng vị trí trong cây.

---

## Phase 3 — Ingestion MQTT → InfluxDB (luồng sensor)

**Chức năng PRODUCT.md:** "Thu thập dữ liệu từ Gateway (MQTT) gửi lên".

**Service:** x-ingestion-service, x-processing-service (theo `ARCHITECTURE.md` § Flow: Gateway sensor data).

**Bảng/measurement liên quan:** `gateway` (`last_seen_at`), InfluxDB `sensor_reading`.

**Nhiệm vụ chính:**
- [x] Quyết định: ingestion service đọc trực tiếp Postgres read-only (không gọi HTTP sang x-backend) cho `gw-resolve` fallback — đúng nguyên tắc "chỉ giao tiếp qua Kafka/Redis/Postgres chung". Chốt luôn contract MQTT/Kafka trước khi code (xem `ARCHITECTURE.md` § Flow: Gateway sensor data): gateway publish **batch** JSON/chu kỳ đọc lên `gateway/{mac_address}/data`, Ingestion **unbundle** thành 1 Kafka message/reading, `messageId` do Ingestion tự sinh (SHA-256 deterministic từ mac+type+pinNumber+measuredAt) thay vì phụ thuộc gateway thật gửi.
- [x] x-ingestion-service: Paho MQTT subscriber (topic `gateway/+/data`), resolve `mac_address` → `gateway_id`/`tenant_id`/`tenant_node_id` (cache Redis `gw-resolve`, TTL 10', fallback query Postgres read-only nếu cache miss; drop message nếu gateway không tồn tại hoặc mồ côi — không có `tenant_node_id`).
- [x] Publish Kafka `sensor-data-raw` (JSON string thuần, không dùng Spring Kafka type-header serializer; key `tenant_id:gateway_id`; header `correlation_id` chung 1 batch).
- [x] x-processing-service: consumer, dedup theo `messageId` (Redis `telemetry-dedup`, TTL 6h), validate schema (Jackson binding + null-check, log + skip không throw), resolve `gateway_pin` theo `(gatewayId, type, pinNumber, direction=INPUT)`, bỏ qua pin `enabled=false` hoặc không tìm thấy.
- [x] Ghi InfluxDB `sensor_reading` (tag `tenant_id`, `tenant_node_id`, `gateway_id`, `metric`), update `gateway.last_seen_at` (native update, bypass `updatable=false`).
- [x] Publish event lên Redis pub/sub channel `realtime:{tenantId}:{tenantNodeId}` (mới, bổ sung vào `DATABASE.md` §5) — tiêu thụ ở Phase 4.
- [x] Unit test (`SensorInboundMqttHandlerTest`, `SensorReadingProcessorTest`) + contract test JSON đối xứng giữa 2 service (`SensorDataRawProducerContractTest` ở ingestion, `SensorDataRawListenerContractTest` ở processing — cùng JSON canonical, không có DTO dùng chung nên đây là nơi bắt lệch field).
- [x] `scripts/simulate-gateway.sh` (mosquitto_pub, hỗ trợ `--interval`/`--measured-at`/`--reading` để test cả loop và dedup).

**DoD:**
- [x] Giả lập publish MQTT → thấy record mới trong InfluxDB `sensor_reading` trong vài giây (verify qua Flux query: `gateway_id=3, metric=temperature, value_float=23.5, quality=GOOD` xuất hiện đúng sau khi publish qua topic `gateway/{mac}/data`; môi trường verify không có sẵn `mosquitto_pub` nên dùng tạm `paho-mqtt` Python — script chính thức vẫn dùng `mosquitto_pub` cho môi trường có cài).
- [x] `gateway.last_seen_at` cập nhật đúng (verify qua `psql`: từ `NULL` → timestamp thật ngay sau khi publish).
- [x] Gửi trùng `messageId` 2 lần (cùng `measuredAt`) → chỉ ghi InfluxDB 1 lần, giá trị giữ nguyên lần ghi đầu (verify: publish lần 2 với `value=99.9`, Influx vẫn trả `23.5`; Redis có đúng key `telemetry-dedup:{tenantId}:{messageId}`).
- [x] Tắt `enabled=false` ở 1 pin → data từ pin đó không được ghi (verify: tạo pin DI/1 metric humidity rồi disable, publish reading cho cả AI/1 và DI/1 — chỉ `temperature` xuất hiện trong InfluxDB, không có `humidity`).

---

## Phase 4 — Dashboard & Realtime hiển thị

**Chức năng PRODUCT.md:** "hiển thị realtime", "Dashboard tùy biến với bộ widget kéo-thả".

**Service:** x-backend, x-frontend.

**Bảng liên quan:** `datastream`, `dashboard`, `dashboard_template`.

**Nhiệm vụ chính:**
- [x] `datastream` (neo vào `gateway_pin`, `source_type='GATEWAY_PIN'` — `EXTERNAL_SOURCE_JOB` để Phase 5) — quyết định lúc code (khác dự kiến ban đầu là CRUD thủ công): **tự động tạo 1-1** trong `GatewayPinServiceImpl.create()` khi tạo pin INPUT, không có endpoint tạo/xóa riêng (khớp nguyên tắc "1 gateway_pin → 1 datastream" đã ghi ở DATABASE.md); backfill dữ liệu cũ qua `V6__backfill_datastream_from_gateway_pin.sql`. Không bị xóa khi tắt pin — `DatastreamResponse` có thêm `sourceEnabled` để FE hiện badge "Pin đã tắt".
- [x] x-backend subscribe Redis pub/sub (channel Phase 3 publish) → push WebSocket/STOMP tới client đang subscribe đúng tenant/node — đã làm sớm hơn dự kiến, cùng lúc với tính năng Gateway Detail (`RedisRealtimeBridge`/`WebSocketConfig`/`StompAuthChannelInterceptor`), tái dùng nguyên trạng cho Dashboard.
- [x] CRUD `dashboard` (`layout_json`: widgets + layout + binding datastream) — GET (get-or-create) + PUT (ghi đè toàn bộ), mỗi user 1 board/node.
- [x] `dashboard_template`: GET list + `POST .../apply-template/{id}` (query datastream theo metric khớp tại node, append widget, dedupe theo type+datastreamId) — seed 1 template mẫu qua `V7__phase4_dashboard_template_seed.sql`. Chưa làm CRUD tạo/sửa template qua API (chỉ seed) — để sau nếu cần.
- [x] x-frontend: `react-grid-layout` kéo-thả/resize widget (v2 API, `useContainerWidth`), ECharts cho widget LINE (dùng chung `buildSparklineOption` với GatewayDetailPage), STOMP client (đã chốt dứt khoát, không còn "hoặc socket.io-client") nhận update realtime + debounce save layout (800ms).
- [x] (đợt 1, quyết định lúc code) Chỉ làm 4/8 loại widget: **VALUE, LINE** (bind datastream trực tiếp) + **DEVICE_COUNT, DEVICES_ONLINE** (tổng hợp gateway theo subtree node qua endpoint mới `GET /tenant-nodes/{id}/device-stats`, polling 30s vì không có realtime event riêng cho online/offline). `SWITCH` (cần Command/Relay — Phase 7), `DEVICE_TABLE`/`EVENT_*` (cần Alert — Phase 6) để phase sau.
- [x] Route `/dashboard/:nodeId` (dùng chung cho mọi loại node, không riêng SITE) + `/dashboard` (Sidebar "Tổng quan" → tự resolve `TENANT_ROOT`). Nút "Xem Dashboard" trên `SiteDetailPage` — **(cập nhật sau này)** `SiteDetailPage` đã bỏ, vào Dashboard của 1 Site qua trang "Tổ chức" hoặc card-grid ở `/dashboard/:nodeId` của node cha.
- [x] (bổ sung sau khi review UI) Dropdown chọn node/site ngay trên trang Dashboard (không phải quay lại Tổ chức mỗi lần đổi site) — dùng chung danh sách node đã có, thụt lề theo `depth`. Dialog **"Thêm widget"** (chỉ hiện khi ở chế độ Chỉnh sửa) — chọn loại widget + datastream (nếu VALUE/LINE) + tên, tự tính vị trí lưới tiếp theo (`lib/dashboardLayout.ts`, khớp logic backend); mỗi widget có nút xóa (hiện khi hover, chỉ trong chế độ Chỉnh sửa). Cả 2 thao tác lưu ngay (`saveNow`, không debounce — khác drag/resize).
- [x] (bổ sung) Lưới nền (`GridBackground` từ `react-grid-layout/extras`) hiện khi bật chế độ Chỉnh sửa, giúp thấy rõ cột/hàng lúc kéo-thả.
- [x] (bổ sung sau UX review lần 2) Sửa loạt lỗi UI Dashboard: (1) bug thật — kéo widget xuống dưới rows hiện có bị lệch vị trí (RGL không tự cao lên khi đang kéo), fix bằng track `liveMaxRow` qua `onDrag`/`onResize` + `minHeight` chủ động trên container, đồng thời fix `useContainerWidth()` đo sai width thoáng qua (default 1280 lúc mount) bằng gọi lại `measureWidth()` khi đổi chế độ; (2) dialog "Thêm widget" đổi từ `<select>` sang lưới card có icon (`WIDGET_TYPE_OPTIONS`); (3) nội dung widget tràn khi thu nhỏ — thêm `min-w-0`/`min-h-0`/`overflow-hidden` xuyên suốt `Widget.tsx` + set `minW=2, minH=2` (grid unit) chặn thu nhỏ quá mức, và `ResizableChart.tsx` (ResizeObserver gọi `echarts.resize()` thủ công vì `echarts-for-react` không tự resize theo container, chỉ theo window); (4) `DEVICE_COUNT` đổi hẳn thành `DEVICE_LIST` — liệt kê gateway dạng list kèm chấm trạng thái, thay vì chỉ đếm số; (5) `DEVICES_ONLINE` thêm số offline + click mở modal danh sách thiết bị offline (0 offline → không mở modal, chỉ hiện tooltip qua Radix Tooltip). Backend: endpoint `/tenant-nodes/{id}/device-stats` (aggregate) đổi hẳn thành `/tenant-nodes/{id}/devices` (list kèm `online` từng gateway) — FE tự đếm total/online/offline từ list, gộp 2 nhu cầu vào 1 endpoint.

**Đợt sau (board ở mọi cấp node — gộp shell):**
- [x] Bỏ giới hạn "chỉ SITE mới có board" (vốn chỉ nằm ở frontend — `uq_dashboard_user_node` không ràng buộc `node_type`). Mọi node có board kéo-thả riêng, bind được kênh của **bất kỳ site nào trong subtree**. Không migration.
- [x] Bỏ sidebar cây tổ chức thường trực (`OrgTreePanel`), thay bằng `TenantNodePicker` trên trang — cùng glyph rẽ nhánh và bộ icon theo cấp với bảng trang Tổ chức (`NODE_ICON` đưa về `lib/tenantNodeLabels.ts` dùng chung). Card-grid Site (`NodeOverviewCards`) bỏ theo vì ô chọn đơn vị đã lo điều hướng; tab "Xem theo nguồn" giữ nguyên và có ở mọi cấp node.
- [x] `includeDescendants` cho `GET /tenant-nodes/{id}/datastreams` và `GET /gateways` — `datastream`/`gateway` chỉ neo vào SITE nên lọc đúng 1 node ở cấp gộp luôn trả rỗng. Mặc định `false`, giữ nguyên hành vi mọi caller cũ.
- [x] Realtime: `useRealtimeGatewaySocket` nhận **nhiều** node, subscribe N topic trên cùng 1 WebSocket; tập topic suy ra từ widget đang có (node của kênh bind + node của gateway bind). Không đụng `RedisRealtimeBridge`/Processing — không fan-out lên node cha, không nhân bản publish, nên chi phí gắn với board chứ không gắn với kích thước cây.
- [x] Tab "Xem theo nguồn" đổi từ lưới card điều-hướng-đi-nơi-khác sang **dropdown chọn nguồn + board kéo-thả tại chỗ** (`SourceDashboardPanel`, dùng lại nguyên trạng — dropdown nhét vào `leftHeader` nên không tốn thêm hàng). Danh sách nguồn lấy theo **scope người dùng** (`GET /external-sources`), không theo node đang chọn — nên tab này ẩn ô chọn đơn vị. Nguồn đang xem nằm ở `?source=<id>`, có param = đang ở tab nguồn → reload/chia sẻ link giữ đúng tab lẫn nguồn. `SourceDashboardPage` thành redirect cho link cũ, `SourceCardGrid` bỏ.
- [x] Siết state chỉnh sửa board: (1) `editMode` vốn là cờ boolean toàn cục nên bật ở board này thì board khác cũng đang sửa — đổi thành `editingBoardKey` (`node:{id}`/`source:{id}`); (2) bỏ hẳn debounce-lưu-theo-cú-kéo, chuyển sang **bản nháp cục bộ**: kéo/thêm/xóa chỉ đổi state, bấm Lưu mới ghi. Debounce cũ `clearTimeout` lúc unmount tức **hủy** chứ không flush, nên kéo widget rồi đổi tab trong 800ms là mất trắng không báo gì (Radix Tabs unmount nội dung tab không hoạt động); mô hình nháp làm việc mất-hay-giữ trở thành lựa chọn tường minh của người dùng thay vì phụ thuộc thời điểm; (3) `useBlocker` chặn mọi đường rời đi khi còn nháp — đổi tab/đơn vị/nguồn đều đi qua điều hướng router (search param) nên một chốt trong `DashboardBoard` phủ luôn cả menu sidebar lẫn nút Back. Đóng/tải lại trình duyệt không chặn (không dùng `beforeunload`).
- [x] `V14__dashboard_template_seed.sql`: thêm 5 mẫu (Môi trường chuồng trại, Khí độc & an toàn, Chất lượng không khí, Thời tiết ngoài trời, Điện năng). Trước đó chỉ có 1 mẫu phủ 2/17 metric nên áp mẫu ở phần lớn node sinh 0 widget và trông như hỏng. Kèm sửa lỗi thật: `ConfirmDialog` mở ngay trong `onSelect` của `DropdownMenuItem` bị Radix đóng theo lúc menu đóng — bấm "Áp dụng mẫu" không có tác dụng gì; hoãn một nhịp là xong.
- [x] Badge "Ngoài phạm vi" trên widget bind kênh không còn trong danh sách của board (kênh bị chuyển sang đơn vị ngoài phạm vi, hoặc đã xóa) — trước đó widget đứng im mà không nói gì.
- [x] Bỏ `GET /tenant-nodes/{id}/overview` cùng DTO/service/query/type ở FE — mồ côi sau khi card grid bỏ và danh sách nguồn chuyển sang `GET /external-sources`.
- [x] Chống nhầm khi gộp nhiều site: dropdown chọn kênh gom nhóm theo site (bỏ tiêu đề nhóm khi chỉ có 1 site); tên widget mặc định kèm tên site khi kênh nằm ngoài node của board (`Chuồng A · Nhiệt độ`). `applyToNode` vốn đã quét subtree từ trước — thêm hộp xác nhận nêu số widget sẽ tạo, vì một cú bấm ở gốc cây có thể sinh vài chục widget.

**DoD:**
- [x] Bind 1 widget LINE vào 1 datastream, publish data từ Phase 3 → chart cập nhật realtime không cần reload (verify bằng publish MQTT thật qua `mosquitto`/paho, thấy sparkline + giá trị cập nhật live không reload trang).
- [x] Kéo-thả, resize widget, reload trang vẫn giữ layout đã lưu (verify qua Playwright: áp template → 2 widget xếp lưới 2 cột → reload → vẫn còn đúng 2 widget).
- [x] Áp dashboard_template vào 1 node có sẵn datastream → tự tạo đúng số widget theo metric (verify: áp "Giám sát cơ bản" vào site có datastream `temperature`+`humidity` → đúng 1 LINE + 1 VALUE được tạo, không tạo trùng khi áp lần 2).

---

## Phase 5 — External source polling

**Chức năng PRODUCT.md:** "Thu thập dữ liệu từ Database/Datasource và hiển thị realtime".

**Service:** x-backend, x-ingestion-service, x-processing-service, x-frontend (theo `ARCHITECTURE.md` § Flow: External source data).

**Bảng/measurement liên quan:** `external_source`, `external_source_job`, InfluxDB `external_reading`, `datastream` (`source_type='EXTERNAL_SOURCE_JOB'`, cột mới `source_field` — `V11`), `dashboard` (cột mới `external_source_id` — `V11`).

**Quyết định chốt lúc code (khác dự kiến ban đầu):** chỉ hỗ trợ `connection_type=POSTGRESQL` (JDBC); field→metric mapping **không** qua `mapping_config` (cột giữ lại, unused/reserved) mà qua `datastream.source_field` — datastream cho external tạo **thủ công** (khác gateway_pin tự động); `external_source` gắn được ở **bất kỳ cấp node** (khác Gateway chỉ SITE); thêm hẳn model điều hướng Dashboard theo Nguồn/Site (xem `DATABASE.md` § dashboard).

**Nhiệm vụ chính:**
- [x] x-backend: CRUD `external_source` (encrypt `credential_encrypted` AES-GCM, key qua `APP_ENCRYPTION_KEY`), CRUD `external_source_job` (`query_config`, `filter_config`, `schedule_cron` — validate identifier allowlist chống SQL injection + parse cron bằng cron-utils).
- [x] x-backend: tạo/xóa `datastream` thủ công cho external (`POST /external-source-jobs/{jobId}/datastreams`, `DELETE /datastreams/{id}`), endpoint `GET /tenant-nodes/{id}/overview` (flatten subtree cho card-grid), Dashboard board riêng theo nguồn (`GET/PUT /external-sources/{id}/dashboard`).
- [x] x-ingestion-service: `@Scheduled` fixed-delay sweep (15s) đọc `schedule_cron`/`next_run_at`/`incremental_cursor` mỗi job tới hạn → JDBC thuần connect `external_source`, build query parameterized từ `query_config`/`filter_config`, unbundle 1 Kafka message/field/row, publish `external-data-raw`.
- [x] x-processing-service: consume, dedup (`TelemetryDedupService` dùng chung), resolve `Datastream(sourceField)` → ghi InfluxDB `external_reading`, publish Redis realtime (payload `datastreamId` trực tiếp, khác payload gateway).
- [x] x-ingestion-service: cập nhật `incremental_cursor`, `last_run_status`, `last_run_at`, `total_row_count`/`last_error` vào Postgres — lỗi vẫn advance `next_run_at` (không retry-storm).
- [x] x-frontend: Dashboard đổi UX — node không phải SITE hiện card-grid (Nguồn + Site, flatten subtree); SITE có 2 tab "Xem site"/"Xem theo nguồn"; trang `SourceDashboardPage` (board riêng theo nguồn, chỉ VALUE/LINE).
- [x] x-frontend: trang "Nguồn dữ liệu" (`/data-sources`, bật nav item đã có sẵn khung "Sắp có" từ Phase 0) — `DataSourcesPage` (danh sách toàn bộ nguồn trong scope, tạo mới) + `DataSourceDetailPage` (sửa/xóa nguồn, CRUD job kèm bộ lọc động, tạo/xóa datastream theo field). Backend thêm `GET /external-sources` (list toàn scope, giống pattern `GET /gateways`).

**Đợt sau (SQL là nguồn sự thật — `V12`):**
- [x] Đổi `query_config` thành `{sql, timestampColumn}`, bỏ `filter_config`/`mapping_config` — lọc vào `WHERE`, biến đổi vào `SELECT`. Migration sinh lại SQL từ config cũ để job đang chạy không đổi hành vi.
- [x] `:cursor` là hợp đồng duy nhất giữa câu SQL và cơ chế đọc tăng dần (`SqlQueryValidator`, 9 unit test). Bỏ allowlist định danh, thay bằng phiên `READ ONLY` + `statement_timeout` + trần dòng.
- [x] x-backend: 4 endpoint mới — thử kết nối (2 dạng), đọc cấu trúc bảng, chạy thử truy vấn, chạy job ngay; thêm `GET /external-source-jobs/{id}/runs`. Lưu job luôn chạy thử ở backend trước khi ghi, và chặn `BOUND_COLUMN_MISSING` khi truy vấn mới mất cột đang gắn kênh.
- [x] Bảng `external_source_job_run` (bảng log, tự dọn sau 7 ngày) cho dải nhịp chạy + biểu đồ số dòng/giờ.
- [x] `startFrom` (`NEW_ONLY`/`ALL_HISTORY`/`FROM_DATE`) — trước đó `incremental_cursor` luôn NULL nên job mới luôn kéo toàn bộ lịch sử mà không ai chọn.
- [x] x-frontend: trang chi tiết nguồn dựng lại — cây bảng, ô soạn SQL tô sáng `:cursor`, bảng chạy thử, thẻ gán cột→metric có sparkline, khối trạng thái vận hành (độ trễ dữ liệu, nhịp chạy, dòng/giờ). Dialog thêm nguồn có nút Kiểm tra kết nối bắt buộc.

**Đợt sau (đọc lại lịch sử theo kênh — `V13`):**
- [x] Bảng `external_source_job_backfill` + cột `datastream.oldest_reading_at` (mốc sớm nhất có số đo liền mạch).
- [x] x-backend: 3 endpoint (ước lượng / xếp tác vụ / đọc tiến độ); `POST .../datastreams` nhận thêm `startFrom` để hỏi mốc ngay lúc gắn kênh muộn.
- [x] x-ingestion-service: sweep riêng + worker đọc **lùi** theo lô có ngân sách thời gian, cập nhật `oldest_reading_at` sau mỗi lô nên ngắt giữa chừng không thủng dữ liệu.
- [x] Cờ `backfill` trong `external-data-raw` để Processing bỏ qua dedup — thiếu nó thì 6 giờ cuối của lỗ hổng bị Redis chặn im lặng.
- [x] Test: `BackfillCursorPlannerTest`, `ExternalSqlSupportTest`, `ExternalReadingProcessorTest`, và **contract test `external-data-raw` hai phía** (luồng external trước đó chưa có contract test nào).
- [x] x-frontend: `BackfillDialog` (chọn mốc + ước lượng + cảnh báo áp công thức SQL hiện tại), nút "Đọc lại lịch sử" + thanh tiến độ trên thẻ cột.

**DoD:**
- [x] Tạo 1 `external_source` trỏ vào chính Postgres dev (`ext_test_readings` test table), tạo job cron `* * * * *` → sau ~1 phút `lastRunStatus=SUCCESS`, `totalRowCount=2`, thấy đủ 4 field/value (`temperature`+`humidity` × 2 timestamp) trong InfluxDB `external_reading` đúng giá trị insert.
- [x] `incremental_cursor` cập nhật đúng = max(timestampColumn) sau mỗi lần chạy.
- [x] Job lỗi (host không kết nối được) → `lastRunStatus=FAILED`, log lỗi rõ ràng, không crash service, service vẫn tiếp tục sweep job khác.
- [x] ~~SQL injection qua `table`/`column` bị chặn 400 `INVALID_IDENTIFIER`~~ — **không còn đúng từ `V12`**: allowlist định danh (`SqlIdentifierValidator`) đã bị bỏ vì người dùng viết SQL tự do. Thay bằng 3 lớp lúc chạy: phiên `READ ONLY` (`readOnlyMode=always`, Postgres bên kia tự từ chối lệnh ghi), `statement_timeout`, và trần dòng.
- [x] Xóa bị chặn đúng thứ tự phụ thuộc: `SOURCE_HAS_JOBS` (409), `JOB_HAS_DATASTREAMS` (409); xóa datastream `GATEWAY_PIN` bị chặn `DATASTREAM_DELETE_NOT_ALLOWED` (400).

---

## Phase 6 — Alert engine (đa kênh)

**Chức năng PRODUCT.md:** "Cảnh báo tức thời dựa trên dữ liệu realtime từ Gateway/Database, gửi qua Email, Telegram".

**Service:** x-processing-service (evaluate/notify), x-backend (CRUD rule + hiển thị badge), x-frontend.

**Bảng liên quan:** `alert_rule`, `alert_channel`, `alert`.

**Nhiệm vụ chính:**
- [ ] x-backend: CRUD `alert_rule` (`conditions_json`, `duration_seconds`, `severity`), CRUD `alert_channel` (EMAIL/TELEGRAM, replace toàn bộ khi sửa rule).
- [ ] x-processing-service: sau mỗi lần ghi reading (Phase 3 & 5), resolve `alert_rule` đang `enabled=true` theo `(tenant_id, tenant_node_id, metric)` (cache Redis `alert-rules`, TTL 60s).
- [ ] Đánh giá `conditions_json`, state machine `PENDING → ACTIVE → RECOVERED` (`uq_alert_open` chặn duplicate alert mở).
- [ ] Gửi notify qua SMTP (Email) / Telegram Bot API khi chuyển `ACTIVE`.
- [ ] Publish trạng thái alert lên Redis pub/sub → x-backend push WebSocket → x-frontend hiện badge.
- [ ] x-frontend: form tạo alert_rule + channel, danh sách alert đang mở, badge realtime trên Dashboard.

**DoD:**
- [ ] Tạo rule threshold, đẩy data vi phạm liên tục đủ `duration_seconds` → alert chuyển `ACTIVE`, nhận được Email và Telegram message.
- [ ] Data về lại bình thường → alert chuyển `RECOVERED`.
- [ ] Vi phạm lần 2 khi alert cũ đã `RECOVERED` → tạo alert mới (không đụng `uq_alert_open` của alert đã đóng).

---

## Phase 7 — Command / Relay control

**Chức năng PRODUCT.md:** "Bật/tắt relay và mở/đóng chân gateway (ở tầng ứng dụng)".

**Service:** x-frontend, x-backend, x-processing-service (theo `ARCHITECTURE.md` § Flow: Command / Relay control — Transactional Outbox).

**Bảng liên quan:** `command`, `outbox_event`, `gateway_pin` (`power_desired_state`/`power_reported_state`).

**Nhiệm vụ chính:**
- [x] x-backend: API bật/tắt relay (`POST /gateways/{id}/pins/{pinId}/commands`), validate `@PreAuthorize` theo scope node + pin phải `direction=OUTPUT`, trong **1 transaction**: ghi `command` (`status=PENDING`) + `outbox_event` (`aggregate_type=command`), check `idempotency_key` (trùng key → trả lại command cũ, không tạo mới).
- [x] x-processing-service: **thêm mới** MQTT client (Paho, outbound + inbound — khác Ingestion Service chỉ inbound), outbox poller (`OutboxPollerService`, fixed-delay 3s, poll `outbox_event` theo `next_attempt_at`), publish Kafka `gateway-commands`, set `status=PUBLISHED`.
- [x] x-processing-service: `GatewayCommandsListener` (Kafka consumer) → `CommandDispatchService` resolve `parameters_json` (`pinType`+`pinNumber`, không phải chỉ `pin` số như doc cũ) → publish MQTT xuống EMQX theo `gateway.mac_address`, `command.status=DISPATCHED`; lỗi publish retry tối đa 3 lần cách 2s rồi `FAILED`.
- [x] x-processing-service: `CommandAckMqttHandler`/`CommandAckService` consume ACK từ Gateway qua EMQX, lưu `ack_payload_json`, update `command.status=ACKNOWLEDGED`/`FAILED` (NACK), `gateway_pin.power_reported_state`.
- [x] x-processing-service: `CommandTimeoutWorker` quét `command` (`status IN (PENDING,DISPATCHED)` & `timeout_at < now()`) → `TIMED_OUT`, fixed-delay 5s.
- [x] `RealtimePublisher.publishCommandStatus` lên Redis pub/sub → WebSocket update UI ngay (tái dùng pipeline Phase 4, `RedisRealtimeBridge` forward nguyên văn không cần sửa Backend) — payload chỉ `{commandId, status, powerReportedState, error}`, FE match theo `commandId` đã biết từ response tạo lệnh, không cần `gatewayId`/`pinId` trong payload.
- [x] x-frontend: `RelaySwitch` component dùng chung — toggle switch relay ở `GatewayDetailPage` (section pin OUTPUT mới) **và** widget `SWITCH` mới trên Dashboard (`AddWidgetDialog` chọn gateway+pin OUTPUT, binding `{gatewayId, pinId}` khác `{datastreamId}` của VALUE/LINE), hiện spinner khi PENDING/DISPATCHED, toast lỗi khi FAILED/TIMED_OUT.
- [x] `scripts/simulate-gateway-command-ack.py` (Python/paho, subscribe command topic + auto ACK sau delay, hỗ trợ `--nack`/`--no-ack`) — dùng để verify DoD vì chưa có gateway thật.

**DoD:**
- [x] Bật relay qua API → `command` chuyển đủ state `PENDING → DISPATCHED → ACKNOWLEDGED`, `gateway_pin.power_reported_state` cập nhật đúng (verify end-to-end thật: `POST .../commands` → outbox poll → Kafka `gateway-commands` → MQTT publish → `simulate-gateway-command-ack.py` nhận lệnh, tự ACK sau 1.5s → DB `command.status=ACKNOWLEDGED`, `gateway_pin.power_reported_state=ON`, `ack_payload_json` lưu đúng).
- [x] Không ACK trong thời gian `timeout_at` (30s mặc định) → chuyển `TIMED_OUT` (verify: gửi lệnh không có listener nào lắng nghe, đợi qua `timeout_at`, `CommandTimeoutWorker` bắt được trong vòng ~5s sau, `error="Hết thời gian chờ ACK từ Gateway"`).
- [x] Submit lệnh 2 lần cùng `idempotency_key` → chỉ tạo 1 `command` (verify: gọi lại đúng `idempotencyKey` đã dùng, API trả về **cùng** `command.id`/status cũ, DB chỉ có 1 row).

---

## Phase 8 — Report generation

**Chức năng PRODUCT.md:** "Reporting" (mục 4, bảng yêu cầu kỹ thuật).

**Service:** x-backend, x-processing-service, x-frontend (theo `ARCHITECTURE.md` § Flow: Report generation).

**Bảng/storage liên quan:** report request (bảng report — cần bổ sung vào `DATABASE.md` nếu chưa có cột cụ thể), MinIO bucket `reports`.

**Nhiệm vụ chính:**
- [ ] x-backend: API tạo report request (loại báo cáo, time range, multi-site/multi-sensor filter), ghi `status=PENDING`, trả `report_id` ngay (async).
- [ ] x-processing-service: report worker nhận job, query đa chiều — metadata/tổ chức + lịch sử `alert` (báo cáo sự cố) từ Postgres, sensor data từ InfluxDB (routing bucket theo time range đã định nghĩa ở `DATABASE.md` § 4).
- [ ] Render theo template engine tương ứng loại báo cáo (PDF/Excel).
- [ ] Upload MinIO `reports/{tenantId}/{yyyy}/{MM}/{reportId}.pdf`, lưu `object_key`/`checksum`/`file_size_bytes`, `status=READY`.
- [ ] x-backend: cấp presigned GET URL (~5′) khi x-frontend poll/nhận notify `READY`.
- [ ] x-frontend: form chọn loại báo cáo + filter, polling trạng thái, nút download khi `READY`.

**DoD:**
- [ ] Tạo report môi trường trong khoảng 7 ngày → nhận file PDF/Excel đúng dữ liệu, download qua presigned URL còn hiệu lực.
- [ ] Report sự cố có kèm danh sách alert đúng thời gian filter.
- [ ] Report request lỗi (VD source rỗng) → `status` phản ánh lỗi, không crash worker.

---

## Phase 9 — Hardening & Deployment

**Mục tiêu:** Đưa hệ thống từ "chạy được" sang "chạy đủ tin cậy để lên production" — theo `context/TECHSTACK.md` mục 4 (Infrastructure/Cloud) và các "Đặc điểm riêng" trong `CONVENTIONS.md`.

**Nhiệm vụ chính:**
- [ ] `correlation_id` xuyên Kafka header ở mọi flow (Phase 3, 5, 6, 7) — trace được 1 request qua nhiều service.
- [ ] Rate limiting (Bucket4j) ở x-backend cho API public-facing.
- [ ] Back-pressure/consumer lag alerting cho Kafka ở x-ingestion-service/x-processing-service (tải cao nhiều gateway).
- [ ] Contract test giữa producer/consumer Kafka (không có DTO chung — theo quyết định đã chốt, JSON schema test thật).
- [ ] Retention/backup: InfluxDB downsample job (raw→1m→5m→1h→1day), Postgres backup lên MinIO `backups/`.
- [ ] Docker image riêng cho từng service (5 Dockerfile: `x-backend`, `x-ingestion-service`, `x-processing-service`, `x-frontend`, `x-frontend-admin`), CI build/push.
- [ ] Deploy lên cloud (AWS/GCP/Azure theo `TECHSTACK.md` mục 4) — EMQX cluster chịu tải, Kafka managed (MSK/Confluent/Aiven).
- [ ] Structured logging (SLF4J+Logback) + request ID xuyên suốt mỗi service.

**DoD:**
- [ ] 1 request end-to-end (VD: bật relay) có thể trace bằng 1 `correlation_id` qua log của cả 3 service backend.
- [ ] Load test MQTT ingestion (giả lập nhiều gateway) không làm chậm API x-backend đang phục vụ user (đúng mục tiêu tách service ở `ARCHITECTURE.md`).
- [ ] Downsample job InfluxDB chạy đúng lịch, dữ liệu raw quá 7 ngày bị dọn theo retention.

---

## Việc tiếp theo

Khi bắt đầu 1 Phase cụ thể: dùng `superpowers:brainstorming` để chốt chi tiết chưa rõ trong Phase đó (VD Phase 3 có 1 câu hỏi mở về việc ingestion service đọc Postgres trực tiếp), sau đó `superpowers:writing-plans` để ra plan TDD bite-sized cho từng task, lưu ở `docs/superpowers/plans/`.
