-- Trạng thái kết thúc thứ hai cho alert: ngừng theo dõi giữa chừng (Phase 6b).
--
-- Tắt/xoá một quy tắc khi sự cố còn đang mở thì engine không bao giờ chạm lại dòng alert đó nữa
-- (truy vấn resolve có `enabled = true AND deleted_at IS NULL`). Trước migration này nó nằm mãi ở
-- PENDING/ACTIVE: trang Cảnh báo hiện sự cố giả, widget đếm sai, và nếu bật lại rule thì reading
-- bình thường đầu tiên sẽ gửi mail "đã hết" cho chuyện đã cũ hàng tuần.
--
-- Không dùng RECOVERED cho ca này vì đó là nói dối — giá trị chưa hề về bình thường, chỉ là không
-- còn ai theo dõi nữa. Báo cáo sự cố (Phase 8) cần phân biệt "đã xử lý xong" với "bỏ dở".
ALTER TABLE alert DROP CONSTRAINT alert_status_check;
ALTER TABLE alert ADD CONSTRAINT alert_status_check
    CHECK (status IN ('PENDING', 'ACTIVE', 'RECOVERED', 'STALE'));

-- uq_alert_open chỉ phủ PENDING/ACTIVE nên STALE tự động nằm ngoài "đang mở": bật lại quy tắc mà
-- vẫn vi phạm thì sinh alert MỚI, không hồi sinh dòng đã bỏ dở.
