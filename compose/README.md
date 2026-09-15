# Compose

| File | Dùng khi |
|------|----------|
| `docker-compose.yml` | **Local dev** — chỉ hạ tầng. 5 service chạy ngoài bằng `scripts/up.sh` |
| `docker-compose.mock-external-db.yml` | Database giả để test tính năng Nguồn dữ liệu ngoài |
| `docker-compose.prod.yml` | **Production** — hạ tầng + 3 backend service + 2 frontend |

Mỗi file ghim `name:` riêng. Bỏ đi là `down` trên file này sẽ coi container của file kia là mồ côi và **xoá luôn**.

## Local dev

```bash
scripts/up.sh        # hạ tầng + 5 service
scripts/down.sh
docker compose -f compose/docker-compose.mock-external-db.yml up -d   # khi cần test nguồn ngoài
```

## Production

```bash
cp .env.example .env.production      # ở ROOT, không phải trong compose/
$EDITOR .env.production              # điền secret — script chặn nếu còn trống
scripts/deploy-prod.sh
```

| Lệnh | |
|---|---|
| `scripts/deploy-prod.sh` | Build phần thiếu rồi khởi động |
| `scripts/deploy-prod.sh --build` | Build lại tất cả — **bắt buộc khi đổi URL frontend** |
| `scripts/deploy-prod.sh --pull` | Cập nhật ảnh hạ tầng |
| `scripts/down-prod.sh` | Dừng, giữ dữ liệu |
| `scripts/down-prod.sh --volumes` | Dừng và xoá sạch dữ liệu (hỏi xác nhận) |

### Thứ tự khởi động

`backend` chạy Flyway nên phải healthy trước `ingestion`/`processing` — hai service này để
`ddl-auto=validate`, schema chưa có là chết ngay lúc boot. `kafka-init` tạo topic rồi thoát.

### Tài khoản MQTT

Không có bước tay nào. `emqx-init` (`docker/emqx/init.sh`, dùng chung DEV và prod) bật xác thực và
tạo/đồng bộ mật khẩu 2 tài khoản mỗi lần khởi động; lỗi thật thì nó thoát khác 0 và ingestion/processing
không lên. Quyền theo topic nằm ở `docker/emqx/acl.conf`.

| Tài khoản | Dùng cho | Mật khẩu |
|---|---|---|
| `MQTT_SERVICE_USERNAME` | ingestion/processing, toàn quyền | `MQTT_SERVICE_PASSWORD` |
| `iiot-gateway` | **mọi gateway dùng chung**, Client ID = MAC, chỉ đụng được topic của MAC đó | `MQTT_GATEWAY_PASSWORD` |

Người dùng xem giá trị điền lên thiết bị ở nút "Thông tin kết nối" của trang chi tiết thiết bị — địa chỉ broker
lấy từ `APP_MQTT_PUBLIC_URL`. Local dev: `iiot-service` / `iiot-service-dev`, `iiot-gateway` / `iiot-gateway-dev`.

### Nới quy mô

Sửa `.env.production` rồi chạy lại `scripts/deploy-prod.sh`:

```
PROCESSING_REPLICAS x PROCESSING_CONCURRENCY  <=  KAFKA_TELEMETRY_PARTITIONS
```

Vượt trần thì bản thừa không được giao partition nào và ngồi không — script chặn trước khi deploy.
Partition **chỉ tăng được, không giảm**, và mỗi lần tăng có cửa sổ ngắn thứ tự bị đảo, nên đặt dư
ngay từ đầu. Chi tiết ở `context/ARCHITECTURE.md` §4.

Ingestion **không** scale bằng thread (Paho chỉ có một callback thread mỗi client) — chỉ tăng
`INGESTION_REPLICAS`.
