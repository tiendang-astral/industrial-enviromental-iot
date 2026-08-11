# Conventions

> Quy tắc code & tổ chức code theo từng tầng, khớp với stack đã chốt trong `TECHSTACK.md`.

---

## 1. Frontend

> Thư mục project: **`x-frontend/`**.

### Nguyên tắc quan trọng

- Component làm 1 việc duy nhất, ưu tiên functional component + hooks
- State lived ở common parent gần nhất; server state (API data) không đưa vào Zustand — để TanStack Query quản lý cache/refetch
- Props đi xuống, callback đi lên
- Không mutate props/query cache trực tiếp — update qua `setQueryData`/mutation
- Lazy load route theo role (System Admin / Tenant Admin / Kỹ thuật viên / Nhân viên) để giảm bundle

### Tổ chức thư mục

```text
src/
├── app/               # App shell, providers (QueryClient, Router, Auth), route config theo role
├── pages/              # Trang / route, orchestration
├── components/
│   ├── ui/            # shadcn/ui component (generated, hạn chế sửa tay)
│   └── widgets/       # Widget Dashboard: VALUE/LINE/SWITCH/DEVICE_COUNT/DEVICES_ONLINE/DEVICE_TABLE/EVENT_*
├── hooks/             # Custom hooks (useAuth, useWebSocket, useScope...)
├── queries/           # TanStack Query hooks (server state) theo domain — useGatewaysQuery, useAlertMutation
├── services/          # Axios instance + interceptor (JWT refresh, tenant header), API call thuần
├── stores/            # Zustand store — UI/local state (sidebar, dashboard edit mode, theme)
├── lib/               # utils, zod schema, echarts option builder, cn()
└── types/             # TypeScript types/interfaces (khớp DTO backend)
```

### Naming convention

| Đối tượng | Format | Ví dụ |
|-----------|--------|-------|
| Component | PascalCase | `UserProfile.tsx` |
| Hook | camelCase, prefix `use` | `useAuth.ts` |
| Query hook | camelCase, prefix `use`, suffix `Query`/`Mutation` | `useGatewaysQuery.ts`, `useCreateAlertMutation.ts` |
| Zustand store | camelCase, prefix `use`, suffix `Store` | `useDashboardStore.ts` |
| Zod schema | camelCase, suffix `Schema` | `createGatewaySchema.ts` |
| Utility | camelCase | `formatDate.ts` |
| Constant | UPPER_SNAKE_CASE | `API_BASE_URL` |
| CSS (Tailwind) | class utility, không viết CSS Module riêng trừ khi cần override phức tạp | `className="flex gap-2"` |

### Layer responsibilities

```text
Page → orchestration, layout, route-level state
  └→ Component → presentation, UI logic
       └→ Hook / Query hook → reusable logic, server-state abstraction (TanStack Query)
            └→ Service → axios call, mapping request/response
Store (Zustand) → chạy song song, chỉ giữ UI/local state, không giữ data từ API
```

### Đặc điểm riêng

- **Component pattern:** Functional component + hooks, compound component cho widget phức tạp (VD: `Widget.Header`, `Widget.Body`)
- **State management:** Zustand cho local/UI state (theme, sidebar, dashboard editing mode); TanStack Query cho server state — cache theo `queryKey` gồm `tenant_id`/`node_id`, invalidate khi nhận event realtime qua socket.io
- **Form handling:** React Hook Form + Zod resolver; validate schema dùng lại được cả client và tham chiếu contract API
- **Styling approach:** Tailwind CSS + shadcn/ui (Radix primitives), biến thể qua `cn()` helper, không viết CSS-in-JS
- **Realtime:** `socket.io-client` subscribe theo `tenant_id`/`site_id`; khi nhận event → `queryClient.setQueryData`/`invalidateQueries` tương ứng, không tạo state riêng song song với cache
- **Chart:** Apache ECharts duy nhất cho time-series (zoom/pan/brush); không trộn thêm chart lib khác
- **Dashboard layout:** `react-grid-layout` cho kéo-thả/resize; lưu `layout_json` lên server qua debounce (tránh gọi API mỗi lần kéo)
- **Thinking in React:** Chia UI thành hierarchy → build static trước → tìm minimal state → xác định state sống ở đâu → thêm inverse data flow

---

## 2. Backend

> Backend là **3 Spring Boot app độc lập** (xem `ARCHITECTURE.md`): **Backend** (REST/WebSocket), **Ingestion Service** (MQTT subscribe + external DB polling), **Processing Service** (Kafka consumer: ghi InfluxDB, alert, command dispatch, report) — mỗi service 1 deployable/Docker image riêng, deploy/scale độc lập để tránh ảnh hưởng hiệu suất lẫn nhau. 3 service giao tiếp với nhau **chỉ qua Kafka/Redis/PostgreSQL chung**, không gọi trực tiếp HTTP/RPC. Thư mục project: **`x-backend/`**, **`x-ingestion-service/`**, **`x-processing-service/`**.

### Nguyên tắc quan trọng

- Single responsibility per class/service, mỗi service có build/CI/CD, health check, log riêng
- Constructor injection (Lombok `@RequiredArgsConstructor`), **cấm** field injection (`@Autowired` trên field)
- Phụ thuộc vào interface Service, không gọi trực tiếp Repository từ Controller
- Validate input tại boundary (`@Valid` + Bean Validation ở Controller/Listener), không validate lại trong Service
- Ingestion/Processing Service không expose REST — chỉ giao tiếp qua Kafka topic hoặc bảng outbox
- Mỗi service tự định nghĩa Entity/DTO riêng (dù cùng map vào 1 bảng Postgres), chỉ khai field nó thực sự cần dùng — **chấp nhận duplicate code giữa 3 service** để giữ độc lập hoàn toàn (build/deploy riêng, không phải publish/version 1 thư viện chung)
- Mọi message/event đi qua Kafka mang `correlation_id` trong header — bắt buộc để trace request xuyên qua network boundary thật giữa các service

### Tổ chức thư mục (3 project độc lập, không chia sẻ code build-time)

```text
x-backend/                         # App riêng, tự build.gradle/pom.xml — REST Controller + WebSocket
└── src/main/java/com/<company>/iot/backend/
    └── <feature>/
        ├── controller/
        ├── service/
        ├── entity/                # Entity riêng của service này, chỉ map field cần dùng
        ├── dto/
        └── mapper/

x-ingestion-service/                # App riêng, tự build.gradle/pom.xml — MQTT subscriber, external poller, Kafka producer
└── src/main/java/com/<company>/iot/ingestion/
    ├── mqtt/
    ├── external/
    ├── entity/
    └── producer/

x-processing-service/                # App riêng, tự build.gradle/pom.xml — Kafka consumer, alert engine, command dispatcher, report worker
└── src/main/java/com/<company>/iot/processing/
    ├── consumer/
    ├── entity/
    ├── alert/
    ├── command/
    └── report/
```

> `x-frontend/`, `x-backend/`, `x-ingestion-service/`, `x-processing-service/` có thể để cùng 1 monorepo hoặc 4 repo riêng — không quan trọng, vì build hoàn toàn tách biệt, không có dependency Gradle/Maven nào giữa các service backend.

### Naming convention

| Đối tượng | Format | Ví dụ |
|-----------|--------|-------|
| Controller | `[Feature]Controller` | `AlertRuleController` |
| Service (interface) | `[Feature]Service` | `AlertRuleService` |
| Service (impl) | `[Feature]ServiceImpl` | `AlertRuleServiceImpl` |
| Repository | `[Feature]Repository extends JpaRepository<E, ID>` | `GatewayRepository` |
| Entity | PascalCase, số ít, khớp tên bảng | `Gateway`, `TenantNode` |
| DTO request | `[Action][Feature]Request` | `CreateGatewayRequest` |
| DTO response | `[Feature]Response` | `GatewayResponse` |
| Mapper (MapStruct) | `[Feature]Mapper` | `GatewayMapper` |
| Kafka producer | `[Topic]Producer` | `SensorDataRawProducer` |
| Kafka consumer/listener | `[Topic]Listener` | `GatewayCommandsListener` |
| MQTT handler | `[Purpose]MqttHandler` | `SensorInboundMqttHandler` |
| Kafka event/DTO (định nghĩa riêng ở mỗi service) | `[Topic]Event` | `SensorDataRawEvent` |
| File name | = tên class, `.java` | `AlertRuleController.java` |

### Layer responsibilities

```text
Controller → nhận request, validate, gọi Service, không chứa business logic
  └→ Service → business logic, orchestrate Repository/Kafka producer
       └→ Repository → Spring Data JPA, không viết raw SQL trừ khi cần (native query phải comment lý do)
            └→ Entity → data model, `ddl-auto: validate` (Flyway là nguồn schema duy nhất)
Mapper (MapStruct) → convert Entity ↔ DTO, không để leak Entity ra ngoài Controller
```

### Đặc điểm riêng

- **Dependency Injection:** Spring IoC, constructor injection qua Lombok `@RequiredArgsConstructor`
- **Error handling:** `@RestControllerAdvice` xử lý exception tập trung; exception domain extend `BusinessException`, map sang response chuẩn (error code + message); async (Kafka listener) log + gửi retry/DLQ, không throw ra ngoài thread pool
- **Security:** Spring Security + JWT (access/refresh); `@PreAuthorize` theo role + scope (`tenant_node_id`, resolve qua `user_role_scope` + ltree); tenant isolation bằng **Hibernate multi-tenancy DISCRIMINATOR** (không dùng RLS) — mọi Entity tenant-scoped gắn `@TenantId`; secrets qua env, credential nhạy cảm (external_source) mã hoá AES-GCM ở application layer
- **Performance:** Tránh N+1 bằng `@EntityGraph`/fetch join; `@Transactional` cho thao tác ghi nhiều bảng cùng lúc (VD: `command` + `outbox_event`); Redis cache cho hot path (`gw-resolve`, `scope-sites`, `alert-rules`); pagination bắt buộc (`Pageable`) cho mọi list endpoint; rate limiting (Bucket4j) ở Backend, back-pressure riêng ở Kafka consumer (Ingestion/Processing)
- **Event-driven / Outbox:** Command dùng transactional outbox (`outbox_event`) — Backend ghi command + event cùng transaction Postgres, Outbox Publisher (trong Processing Service) poll và publish Kafka, tránh dual-write; notification (email/telegram) tách khỏi request thread, xử lý bất đồng bộ trong Processing Service
- **Repository pattern:** Spring Data JPA interface, che giấu query sau interface; Entity không lộ ra API layer (luôn qua Mapper)
- **API Design:** DTO tách khỏi Entity qua MapStruct; response format nhất quán (wrapper `ApiResponse<T>` hoặc RFC 7807 problem detail cho lỗi); versioning qua path `/api/v1/...`
- **Resilience giữa service:** Kafka là buffer chống cascading failure — Ingestion Service down không mất data (Kafka giữ), Processing Service down không chặn Ingestion; consumer retry + DLQ topic cho message lỗi liên tục; timeout/circuit breaker khi 1 service phụ thuộc trạng thái của service khác qua DB (VD: Backend đọc `command.status` do Processing cập nhật)
- **Testing:** JUnit 5 + Mockito cho unit test Service (mock Repository/Kafka producer) trong từng service; `@SpringBootTest` + Testcontainers (Postgres/Kafka/Redis) cho integration test riêng mỗi service; do không có DTO event dùng chung để compiler bắt lỗi lệch field, cần contract test chạy JSON thật qua Kafka giữa producer/consumer (VD: Ingestion đổi field trong `sensor-data-raw` phải có test xác nhận Processing vẫn đọc đúng) + test đầu-cuối (Ingestion → Kafka → Processing) trên staging trước khi deploy service đổi schema event
- **Observability:** SLF4J + Logback structured logging (JSON) + `correlation_id` xuyên suốt qua Kafka header (bắt buộc vì giờ là network hop thật giữa 3 service, không phải call trong-process); mỗi service có Spring Boot Actuator health check + log riêng theo service name; graceful shutdown cho Kafka consumer (drain trước khi tắt)

---

## 3. Database

### Nguyên tắc quan trọng

- Snake_case cho table và column, **tên bảng số ít** (`tenant_node`, không phải `tenant_nodes`)
- Luôn có `created_at`, `updated_at` (timestamptz); bảng có audit theo user thêm `created_by`, `updated_by`
- Soft delete bằng `deleted_at` thay vì xóa cứng (trừ bảng log/state machine như `alert`, `command`, `outbox_event`)
- **Flyway là nguồn schema duy nhất** (`ddl-auto: validate`) — không sửa tay DB, mọi thay đổi qua migration file mới, không sửa lại file migration cũ đã chạy
- Tenant isolation qua Hibernate `@TenantId` (DISCRIMINATOR), không dùng Postgres RLS; bảng self-reference/parent-child luôn thêm composite FK `(tenant_id, parent_id) → (tenant_id, id)` để chặn cross-tenant reference ở tầng DB
- PK mặc định `bigint` auto increment; bảng cần generate ID ở nhiều nơi hoặc expose ra hệ thống ngoài (`command`, `outbox_event`) dùng `uuid`

### Tổ chức thư mục

```text
src/main/resources/db/migration/
├── V1__baseline_schema.sql    # Baseline đã squash (2026-06-30)
├── V2__baseline_seed.sql      # Seed data (role, metric, dashboard_template...)
└── V{n}__{mô_tả_ngắn}.sql     # Mỗi thay đổi = 1 file mới, versioned, không sửa file cũ
```

### Naming convention

| Đối tượng | Format | Ví dụ |
|-----------|--------|-------|
| Table | snake_case, số ít | `tenant_node`, `alert_rule` |
| Column | snake_case | `created_at`, `tenant_node_id` |
| Primary key | `id` (`bigint`, một số bảng dùng `uuid`) | `id` |
| Foreign key | `[table]_id` | `gateway_id`, `tenant_node_id` |
| Unique constraint | `uq_[table]_[cột/ý nghĩa]` | `uq_gateway_mac`, `uq_alert_open` |
| Index thường | `ix_[table]_[cột/ý nghĩa]` | `ix_gateway_node` |
| Check constraint | inline `CHECK (...)`, không cần đặt tên riêng trừ khi debug | `CHECK (status IN ('ACTIVE','LOCKED'))` |

### Layer responsibilities

```text
Migration (Flyway) → thay đổi schema an toàn, versioned, baseline + incremental
  └→ Entity (Hibernate, ddl-auto=validate) → khớp 1-1 với schema, không tự sinh DDL
       └→ Repository (Spring Data JPA) → abstract query, tránh N+1 (fetch join/@EntityGraph)
            └→ Query → parameterized, dùng index đã khai báo, có `LIMIT`/pagination cho list
```

### Đặc điểm riêng

- **Materialized view:** Chưa dùng — index + tách time-series ra InfluxDB đã đủ cho query hiện tại; cân nhắc nếu sau này cần dashboard aggregate cross-tenant nặng trên Postgres
- **Summary table:** Chưa dùng — dự phòng cho báo cáo thống kê tần suất sự cố nếu query trực tiếp `alert` history chậm dần theo thời gian
- **Extension:** `ltree` (materialized path cho `tenant_node.path`, GiST index cho descendant query), `pg_partman` (partition bảng log/alert-history theo thời gian, dễ archive/xóa)
- **InfluxDB (time-series):** Convention riêng, không áp dụng SQL naming ở trên — measurement số ít (`sensor_reading`, `external_reading`), tag/field snake_case; downsample raw → 1m → 5m → 1h → 1d qua continuous query, retention phân cấp theo bucket
- **Redis:** Key convention `{feature}:{scope}:{id}` (VD: `gw-resolve:{mac}`, `scope-sites:{tenant}:{user}`); **TTL bắt buộc** cho mọi key — Redis không phải nguồn bền vững, mất Redis chỉ giảm hiệu năng, không mất cấu hình (Postgres)
- **MinIO:** Object key convention `{bucket}/{tenantId}/{yyyy}/{MM}/{id}.{ext}` (VD: `reports/{tenantId}/{yyyy}/{MM}/{reportId}.pdf`); Postgres lưu `object_key`/`checksum`/`file_size_bytes`, API cấp presigned URL ngắn hạn, không public bucket
