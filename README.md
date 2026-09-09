# Industrial Environmental IoT

Phần mềm thu thập dữ liệu cảm biến đa điểm và hiển thị realtime trên dashboard, kèm cảnh báo tức thời.

Dữ liệu vào từ hai nguồn:

- **Gateway qua MQTT** — thiết bị ngoài hiện trường đọc cảm biến rồi gửi lên theo chu kỳ
- **Database bên ngoài** — hệ thống tự đọc database của khách theo lịch

Dành cho kỹ sư vận hành cần theo dõi môi trường/sản xuất đa điểm — nhỏ gọn, đủ dùng.

## Tính năng

**App người dùng**

- Dashboard tùy biến — widget kéo-thả, cập nhật realtime
- Quản lý tổ chức đa cấp — Công ty → Chi nhánh → Khu sản xuất → Xưởng/Chuồng
- Quản lý gateway và chân cảm biến
- Nguồn dữ liệu ngoài — kết nối database khách, đọc theo lịch, vá dữ liệu lịch sử
- Cảnh báo theo ngưỡng — gửi qua Email và Telegram
- Điều khiển relay — bật/tắt thiết bị từ xa
- Báo cáo môi trường và báo cáo sự cố — xuất PDF
- Quản lý người dùng và phân quyền theo đơn vị

**Trang quản trị**

- Quản lý tenant
- Quản lý tài khoản quản trị hệ thống
- Dashboard tổng hợp toàn platform

## Gồm 5 phần chạy độc lập

| | |
|---|---|
| `x-frontend` | App người dùng — dashboard, cảnh báo, báo cáo |
| `x-frontend-admin` | Trang quản trị — quản lý tenant |
| `x-backend` | API + WebSocket |
| `x-ingestion-service` | Nhận dữ liệu từ gateway và database ngoài |
| `x-processing-service` | Xử lý, lưu trữ, chạy cảnh báo |

---

# Runbook

## Chạy local

Cần Docker, JDK 21, Node 22.

```bash
scripts/up.sh      # bật hạ tầng + cả 5 phần
scripts/down.sh    # tắt
```

| | |
|---|---|
| App người dùng | http://localhost:7100 — `admin1` / `123456` |
| Trang quản trị | http://localhost:7200 — `admin` / `123456` |
| EMQX Dashboard | http://localhost:18083 — `admin` / `public` |
| MailHog (xem mail) | http://localhost:8025 |

## Deploy production

```bash
cp .env.example .env.production
$EDITOR .env.production
scripts/deploy-prod.sh
```

| | |
|---|---|
| `scripts/deploy-prod.sh` | Khởi động |
| `scripts/deploy-prod.sh --build` | Build lại — **bắt buộc khi đổi địa chỉ truy cập** |
| `scripts/down-prod.sh` | Dừng, giữ dữ liệu |
| `scripts/down-prod.sh --volumes` | Dừng và xoá sạch dữ liệu |

Lần đầu build mất 1–2 tiếng. Script tự kiểm tra cấu hình và dừng ngay nếu thiếu, không để bạn chờ rồi mới báo lỗi.

**Bốn thứ phải sửa trong `.env.production`:**

```bash
# 1. Mật khẩu — để trống là script không cho chạy
POSTGRES_PASSWORD=  APP_JWT_SECRET=  ...

# 2. Địa chỉ người dùng gõ vào trình duyệt
TENANT_WS_BASE_URL=ws://<địa-chỉ>:31080/ws
APP_CORS_ALLOWED_ORIGINS=http://<địa-chỉ>:31080,http://<địa-chỉ>:31090

# 3. Bỏ dòng dev-seed đi khi chạy thật (nếu để, sẽ có sẵn tài khoản admin/123456)
FLYWAY_LOCATIONS=classpath:db/migration
```