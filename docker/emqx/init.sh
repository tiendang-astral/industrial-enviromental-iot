#!/bin/sh
# Bật xác thực MQTT và tạo 2 tài khoản — service emqx-init chạy script này sau khi EMQX healthy (DEV lẫn prod).
#
# EMQX 5 không có biến EMQX_ALLOW_ANONYMOUS (cú pháp 4.x): chặn ẩn danh bằng cách khai authenticator.
# Chạy lại an toàn: authenticator đã có thì bỏ qua, tài khoản đã có thì cập nhật mật khẩu theo env.
set -eu

API="${EMQX_API:-http://emqx:18083/api/v5}"
: "${EMQX_DASHBOARD_PASSWORD:?}" "${MQTT_SERVICE_USERNAME:?}" "${MQTT_SERVICE_PASSWORD:?}" "${MQTT_GATEWAY_PASSWORD:?}"
# Cố định vì acl.conf viết luật theo đúng tên này.
GATEWAY_USERNAME=iiot-gateway
AUTHN_ID="password_based%3Abuilt_in_database"
OUT=/tmp/emqx-init.out

TOKEN=$(curl -sf -X POST "$API/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"admin\",\"password\":\"$EMQX_DASHBOARD_PASSWORD\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$TOKEN" ] || { echo "Không đăng nhập được EMQX API"; exit 1; }

# request <method> <path> [json] -> in HTTP code, body ở $OUT
request() {
  curl -s -o "$OUT" -w '%{http_code}' -X "$1" "$API$2" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' ${3:+-d "$3"}
}

fail() { echo "$1: HTTP $2 — $(cat "$OUT")"; exit 1; }

# Bắt buộc khai password_hash_algorithm: thiếu nó API trả 400, và nếu nuốt lỗi thì EMQX vẫn cho ẩn danh.
code=$(request GET "/authentication/$AUTHN_ID")
if [ "$code" = "404" ]; then
  code=$(request POST /authentication \
    '{"mechanism":"password_based","backend":"built_in_database","user_id_type":"username","password_hash_algorithm":{"name":"sha256","salt_position":"suffix"}}')
  [ "$code" = "200" ] || fail "Bật xác thực" "$code"
  echo "Xác thực: đã bật"
elif [ "$code" = "200" ]; then
  echo "Xác thực: đã bật từ trước"
else
  fail "Đọc authenticator" "$code"
fi

upsert_user() {
  code=$(request POST "/authentication/$AUTHN_ID/users" "{\"user_id\":\"$1\",\"password\":\"$2\"}")
  case "$code" in
    201) echo "Tài khoản $1: đã tạo" ;;
    409)
      code=$(request PUT "/authentication/$AUTHN_ID/users/$1" "{\"password\":\"$2\"}")
      [ "$code" = "200" ] || fail "Cập nhật mật khẩu $1" "$code"
      echo "Tài khoản $1: đã có, mật khẩu đồng bộ theo env" ;;
    *) fail "Tạo tài khoản $1" "$code" ;;
  esac
}

upsert_user "$MQTT_SERVICE_USERNAME" "$MQTT_SERVICE_PASSWORD"
upsert_user "$GATEWAY_USERNAME" "$MQTT_GATEWAY_PASSWORD"
