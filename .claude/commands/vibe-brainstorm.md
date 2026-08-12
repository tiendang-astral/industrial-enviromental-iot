# /vibe-brainstorm

Phân tích yêu cầu, khám phá và động não các phương án.

## Steps

1. Dùng `brainstorming` skill để phân tích yêu cầu và động não các phương án. Nếu có `.codegraph/`, dùng `codegraph_explore` để hiểu context codebase hiện tại.
2. Grill user — hỏi những câu cần thiết để có yêu cầu cụ thể nhất. KHÔNG đoán mò, hỏi đến khi đủ rõ.
3. Đưa ra 2-3 phương án, mỗi phương án nêu rõ ưu nhược điểm và trade-off.

## Output format

```
## Brainstorm: [tên vấn đề]

### Vấn đề thực sự
...

### Phương án A: [tên]
- Mô tả: ...
- Ưu điểm: ...
- Nhược điểm: ...

### Phương án B: [tên]
...

### Đề xuất
(nếu có phương án nổi bật hơn thì nêu lý do — quyết định cuối vẫn do user)
```