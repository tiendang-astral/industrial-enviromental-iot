-- Mẫu bố cục dashboard chuyển hẳn sang code FE (x-frontend/src/lib/dashboardTemplates.ts).
--
-- Bảng này chưa bao giờ là dữ liệu: không có tenant_id (dùng chung mọi tenant), không tenant nào
-- sửa được, runtime không ghi vào — mọi thay đổi đều phải qua migration. Tức là hằng số nằm nhầm
-- chỗ. Ở FE nó còn làm được thứ bảng không làm được: dựng bố cục ngay trên máy nên chỉ gợi ý mẫu
-- thật sự có kênh để dựng, và áp mẫu thành bản nháp hoàn tác được thay vì ghi thẳng xuống DB.
DROP TABLE IF EXISTS dashboard_template;
