# /vibe-plan

Lập kế hoạch implement từ yêu cầu hoặc phương án đã chọn (từ `/vibe-brainstorm` hoặc trực tiếp từ user).

## Steps

1. Nếu yêu cầu chưa đủ rõ, grill user — không đoán mò.
2. Dùng `codegraph_explore` để xác định file nào bị ảnh hưởng.
3. Viết plan và in ra để developer review.
4. **Chờ user confirm cập nhật tài liệu trong `context/`** (DATABASE.md, ARCHITECTURE.md, API.md, CONVENTIONS.md ...) nếu plan thay đổi kiến trúc hoặc schema.
5. **Chờ user confirm trước khi chuyển sang `/vibe-code`.**

## Output format

```
## Plan: [tên task]

### Mô tả

[Giải thích ngắn gọn plan sẽ làm gì]

### Thay đổi database

- [ ] ...
- [ ] ...

### Thay đổi logic backend

- [ ] ...
- [ ] ...

### Trước / Sau khi áp dụng

| | Trước | Sau |
|---|-------|-----|
| | ... | ... |
```
