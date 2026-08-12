# /vibe-code

Bắt đầu code sau khi plan đã được confirm.

## Prerequisites

- Đã chạy `/vibe-start`
- Đã có plan confirmed từ `/vibe-plan`

## Steps

1. Dùng `codegraph_explore` để tìm file liên quan — không đọc file mù
2. Code theo plan, từng bước một
3. Sau mỗi bước: kiểm tra không break existing logic
5. Khi xong: tóm tắt ngắn gọn những gì đã làm

## Rules khi code

- Task có UI/frontend: dùng `design-taste-frontend` skill trước khi tạo component mới
- Follow folder structure và naming convention trong `CONVENTIONS.md`
- Follow architecture rule trong `ARCHITECTURE.md`
- Dùng CodeGraph trước, đọc file trực tiếp sau
- Không dùng git như git add, git commit, ... khi làm dự án.
- Không comment dài dòng, chỉ comment code ngắn gọn, xúc tích cho những logic khó hiểu, phức tạp hoặc cần hiểu biết nghiệp vụ.

## Tận dụng MCP tools theo ngữ cảnh

| Tình huống | Tool nên dùng |
| --- | --- |
| Cần hiểu API / docs của lib/framework | **Context7** |
| Làm việc với database (query, schema, data) | **dbhub** |
| Debug container, xem logs | **Docker MCP** |
| Implement UI từ file thiết kế | **Figma MCP** |
