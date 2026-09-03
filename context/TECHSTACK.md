# Tech Stack

> Liệt kê thư viện/công nghệ xương sống cần thiết. Bỏ trống nếu project không dùng.

## 1. Frontend

| Đầu mục | Thư viện | Version | Ghi chú |
|---------|----------|---------|---------|
| Framework | React + Vite | React 19, Vite 8 | SPA sau login, không cần SSR/SEO |
| Routing | React Router | 7.x | SPA routing, nested route, lazy loading theo role |
| UI Library | shadcn/ui (`radix-ui` + `@base-ui/react` + Tailwind CSS 4) | shadcn CLI 4.x | Đã cài **đủ 62 component** của registry `@shadcn` cho cả 2 app (2026-08-14). Style `radix-nova`, baseColor neutral, token OKLCH trong `src/index.css` (Tailwind 4 CSS-first, không có `tailwind.config`). Component thế hệ mới (`Field`, `Empty`, `Item`, `Spinner`, `InputGroup`) chạy trên Base UI nên `radix-ui` và `@base-ui/react` cùng tồn tại — chú ý `asChild` (radix) vs `render` (base) khi viết custom trigger |
| State Management | Zustand + TanStack Query | Zustand 5.x, TanStack Query 5.x | Zustand cho local/UI state (`useUiStore`, `useThemeStore`, `useRealtimeStore`), TanStack Query cho server state + cache + realtime invalidation |
| Form / Validation | React Hook Form + Zod | RHF 7.x, Zod 4.x | Dùng `Field`/`FieldGroup`/`FieldError` — `@shadcn/form` (`Form`/`FormField`) đã bị shadcn khai tử, registry item nay rỗng |
| Call API | Axios | 1.x | Interceptor cho JWT refresh, multi-tenant header |
| Icon | Lucide | | Icon library cho shadcn/ui |
| Chart | Apache ECharts (`x-frontend`), Recharts (`x-frontend-admin`) | 5.x / 3.x | `x-frontend`: time-series lớn, zoom/pan/brush mượt hơn Chart.js/Recharts cho dashboard IoT. `x-frontend-admin`: Recharts qua shadcn `components/ui/chart.tsx` (đã có sẵn từ lúc cài đủ 62 component, dùng chính thức từ trang Dashboard admin — line/area biến động + bar ngang top tenant), không kéo theo ECharts vì scope nhẹ hơn nhiều so với `x-frontend` |
| Canvas / Rich Editor | react-grid-layout | 1.x | Widget kéo-thả, resize, lưu layout per-site/per-user |
| Realtime | @stomp/stompjs | 7.x | STOMP-over-WebSocket, khớp `Spring WebSocket` ở Backend — không dùng socket.io vì Spring không có server socket.io chính thức (quyết định chốt khi làm trang Chi tiết Gateway, ban đầu doc ghi nhầm socket.io-client) |
| Bundler | Vite | 8.x | |
| Animation | tw-animate-css + biến `--motion-*` | 1.x | Không dùng thư viện animation JS (Motion/GSAP) — dashboard đọc số realtime cần animation kín đáo, xem `CONVENTIONS.md` § Quy tắc styling |
| Testing | Vitest + React Testing Library | | |

## 2. Backend

| Đầu mục | Thư viện | Version | Ghi chú |
|---------|----------|---------|---------|
| Framework | Spring Boot (Java 21+) | Spring Boot 4.x | Khớp layer Controller/Service/Repository/DTO đã định nghĩa trong CONVENTIONS.md |
| ORM / Query Builder | Spring Data JPA (Hibernate 7.x) | | Entity + Repository pattern, migration versioned |
| Realtime | Spring WebSocket + Redis | | Redis để fan-out realtime khi scale ngang nhiều instance |
| MQTT Client | Eclipse Paho (Spring Integration MQTT) | | Subscribe topic từ EMQX, forward vào Kafka |
| Message Queue Client | Spring Kafka | | Producer/Consumer cho Ingestion Pipeline |
| Auth | JWT (access + refresh) + Spring Security | | RBAC theo tenant/role (System Admin / Tenant Admin / Kỹ thuật viên / Nhân viên) |
| Authorization | Spring Security ACL / @PreAuthorize | | Policy-based, scope theo tenant → chi nhánh → khu sản xuất → xưởng |
| Rate Limiting | Bucket4j / Custom | | Bảo vệ API layer, back-pressure riêng ở Ingestion Pipeline |
| Validation | javax.validation (Bean Validation) | | Validate tại boundary (controller) |
| DTO Mapping | MapStruct / Manual | | Tách DTO khỏi Entity |
| Logging | SLF4J + Logback | | Structured logging + request ID |
| Cache | Redis | 7.x | Cache hot-path dashboard query, session, pub/sub cho WebSocket |
| Queue / Job | Spring Boot + Redis (or Spring Batch) | | Job async: gửi email/telegram, generate report, aggregate job |
| Testing | JUnit 5 + Mockito | | Unit test service, integration test qua HTTP |

## 3. Database

| Đầu mục | Công nghệ | Version | Ghi chú |
|---------|-----------|---------|---------|
| Database Engine (relational) | PostgreSQL | 16.x | Tenant/org hierarchy, user/role, dashboard config, alert rule, report template |
| Database Engine (time-series) | InfluxDB | 2.x | Sensor data — measurement/tag/field, continuous query aggregate raw→1m→5m→1h→1day, retention policy phân cấp |
| Cache / Broker | Redis | 7.x | Cache + pub/sub + Spring backing store |
| Extension (PostgreSQL) | pg_partman | | Partition bảng log/alert-history theo thời gian, dễ archive/xóa |
| Migration Tool | Flyway or Liquibase | | Schema đổi qua migration, versioned, không sửa tay |

## 4. Infrastructure / Cloud

| Đầu mục | Công nghệ | Ghi chú |
|---------|-----------|---------|
| MQTT Broker | EMQX (cloud-managed hoặc self-host trên cloud) | Chịu tải cao, hàng nghìn kết nối concurrent từ Gateway/Site |
| Message Queue | Apache Kafka (cloud-managed: AWS MSK / Confluent Cloud / Aiven) | At-least-once delivery, partition theo device_id/site_id, decouple ingestion khỏi xử lý |
| Cloud Platform | AWS / GCP / Azure | Tùy khách hàng — triển khai cloud-native, không on-premise |

## 5. Third-party services

| Đầu mục | Service | Ghi chú |
|---------|---------|---------|
| Payment | — | Không áp dụng |
| Email | SMTP (SendGrid / AWS SES / SMTP nội bộ) qua Nodemailer | Kênh cảnh báo |
| SMS / Notification | Telegram Bot API | Kênh cảnh báo chính, realtime, chi phí thấp |
| Storage (S3, Blob) | AWS S3 / GCP Cloud Storage | Lưu report export (PDF/Excel), backup |
| Search Engine | — (Postgres full-text search đủ dùng cho log/alert history) | |
| Analytics | — | Không áp dụng, nội bộ |

## 6. Lý do chọn stack này

- **EMQX + Kafka + InfluxDB** giữ nguyên theo yêu cầu kỹ thuật đã chốt: EMQX chịu tải kết nối MQTT lớn, Kafka đảm bảo at-least-once + buffer/backpressure trước khi ghi InfluxDB, InfluxDB tối ưu cho time-series volume lớn với retention/aggregate phân cấp.
- **Spring Boot + Spring Data JPA** vì kiến trúc Controller/Service/Repository/DTO đã mô tả sẵn trong `CONVENTIONS.md` — Spring Boot là framework enterprise chuẩn, ecosystem lớn, ổn định, phù hợp hệ thống IoT cần độ tin cậy cao.
- **PostgreSQL** cho dữ liệu quan hệ (tenant, user, RBAC, cấu hình dashboard, alert rule, report template) — tách biệt rõ với time-series data, tránh InfluxDB gánh cả metadata lẫn sensor data.
- **Redis** đóng vai trò kép: cache hot-path (dashboard đang xem nhiều) và pub/sub để WebSocket fan-out hoạt động đúng khi scale ngang nhiều instance backend.
- **shadcn/ui + Tailwind CSS**: UI library tùy biến, không ràng buộc style như Ant Design — dễ xây dựng dashboard quản trị tenant nhiều cấp, linh hoạt theo yêu cầu khách hàng.
- **Apache ECharts**: Time-series lớn, zoom/pan/brush mượt hơn Chart.js/Recharts cho dashboard IoT.
- **React + Vite**: ưu tiên tốc độ dựng UI quản trị/dashboard dày đặc dữ liệu (bảng, cây tổ chức, form cấu hình) mà vẫn "nhỏ gọn, đủ dùng" — không kéo theo bộ máy SSR/meta-framework không cần thiết cho một app sau-login.
- **Telegram Bot API + SMTP**: đúng 2 kênh cảnh báo yêu cầu, chi phí thấp, dễ tích hợp, không cần thêm nhà cung cấp SMS trả phí.
