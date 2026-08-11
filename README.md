# Vibe Coding Template

Template chuẩn hóa workflow cho vibe coding. Setup một lần, dùng mãi mãi.

## 1. Cấu trúc

```text
vibe-template/
├── context/
│   ├── PRODUCT.md           # Sản phẩm, người dùng, chức năng
│   ├── TECHSTACK.md         # Công nghệ theo từng tầng
│   ├── ARCHITECTURE.md      # Component diagram, data flow
│   ├── DATABASE.md          # ERD, bảng, indexes
│   ├── API.md               # Base URL, response format, endpoints
│   ├── CONVENTIONS.md       # Quy tắc code Frontend/Backend/Database
│   └── business/            # Tài liệu nghiệp vụ
│       └── README.md
├── .claude/
│   └── commands/            # Slash commands
│       ├── vibe-start.md    # Đọc context + codegraph
│       ├── vibe-brainstorm.md  # Phân tích yêu cầu
│       ├── vibe-plan.md     # Lập plan chi tiết
│       └── vibe-code.md     # Implement theo plan
└── README.md                # File này
```

## 2. Commands

```
/vibe-start → /vibe-brainstorm → /vibe-plan → /vibe-code
```

| Command | Mô tả |
|---------|-------|
| `/vibe-start` | Đọc toàn bộ context, nắm codebase |
| `/vibe-brainstorm` | Phân tích yêu cầu, đề xuất phương án |
| `/vibe-plan` | Lập plan, chờ confirm |
| `/vibe-code` | Implement theo plan |

## 3. Tool

### Skills

| Skill | Mục đích |
|-------|----------|
| `design-taste-frontend` | UI/frontend design premium |
| `using-superpowers` | Superpowers plugin — brainstorm, plan, code flow |

### MCP Servers

| Server | Mục đích |
|--------|----------|
| **CodeGraph** | Query codebase, symbol search, call paths |
| **Context7** | Tra cứu docs framework mới nhất |
| **Docker** | Quản lý container |
| **Claude Mem** | Memory/context persistence giữa các session |

### Sub-agents

Tương tự 1 phòng ban — mỗi agent lo 1 vai trò, không chồng chéo.

| Agent | Context | Responsibility |
|-------|---------|----------------|
| `product-manager` | `PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `business/` | Quy hoạch hệ thống, review tính năng, quyết định tech |
| `backend-dev` | `TECHSTACK.md`, `CONVENTIONS.md` (BE), `API.md`, `DATABASE.md` | API, business logic, DB schema, migrations |
| `frontend-dev` | `TECHSTACK.md`, `CONVENTIONS.md` (FE), `API.md` | UI components, state, styling, integration API |
| `ui-designer` | `PRODUCT.md` | Thiết kế UI/UX, layout dashboard, component hierarchy, responsive, design system |
| `devops` | `TECHSTACK.md`, `ARCHITECTURE.md` | CI/CD, Docker, deploy, monitoring |

**Tạo sub-agent:** Trong Claude Code, dùng `Task` tool với prompt chứa context file:

```text
Task(subagent_type="general")
- description: "product-manager"
- prompt: "Đọc PRODUCT.md, ARCHITECTURE.md, DATABASE.md, business/README.md. Context: [mô tả task]. Yêu cầu: [cần làm gì]."
```

## 4. Setup

Làm **một lần** trên máy. Sau đó mỗi project chỉ cần copy template.

```bash
# Claude Code
npm install -g @anthropic-ai/claude-code

# Plugins (trong Claude Code)
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace

# MCP Servers
claude mcp add -s user dbhub -- npx -y @bytebase/dbhub --transport stdio --dsn "postgres://user:pass@localhost:5432/mydb"
claude mcp add -s user --transport http context7 https://mcp.context7.com/mcp
```

- **Docker**: Docker Desktop → Settings → Features → MCP Toolkit → Enable
- **Claude Mem**: https://github.com/anthropics/claude-code-memory

## 5. Bắt đầu

```bash
cp -r vibe-template/ my-new-project/
cd my-new-project/
codegraph init
```

Điền context vào `context/`, mở Claude Code → `/vibe-start`.
