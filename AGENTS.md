# Meridian AI News Aggregator - 开发规范

文档工作流、状态机、Agent 权限等以 **`.cursor/rules/docs-agents_v1.md`** 为准；**文档审核门控**以 **docs/_policies/doc-review-gate.policy.md** 为准。本文描述**本仓库（Meridian）**的代码架构、构建、风格与扩展方式。

---

## 项目架构

### 代码组织 (Monorepo)

本项目采用 **Turborepo** 与 **pnpm** 管理的 Monorepo 结构：

```
meridian/
├── apps/
│   ├── backend/         # 后端服务 (Cloudflare Workers, Hono, Durable Objects)
│   └── frontend/        # 前端应用 (Nuxt 3, Vue 3, TailwindCSS)
├── packages/
│   ├── database/        # 共享数据库层 (Drizzle ORM Schema, PostgreSQL 连接)
│   └── logger/          # 统一日志库 (@meridian/logger)
├── services/
│   └── meridian-ml-service/ # 机器学习微服务 (Python, FastAPI, Embeddings)
├── docs/                # **唯一文档中心**：所有开发文档统一存放于此
├── .cursor/rules/       # AI 助手规则
├── start_all.js         # 本地开发环境编排脚本
├── package.json         # Root 依赖与工作空间配置
└── turbo.json           # Turbo 任务管道配置
```

### 各目录职责

| 目录/模块 | 技术栈 | 职责简述 |
| :--- | :--- | :--- |
| **apps/backend** | CF Workers, Hono | 核心 API 路由、数据源采集调度 (Durable Objects)、文章处理工作流 (Workflows)。 |
| **apps/frontend** | Nuxt 3, Vue 3 | 用户界面、RSS 源管理后台、文章展示与搜索交互。 |
| **services/ml** | Python 3.11, FastAPI | 文本向量化 (Embeddings)、语义分析、AI 模型推理服务。 |
| **packages/db** | Drizzle ORM | 定义数据库 Schema (PostgreSQL + pgvector)、类型导出、迁移脚本。 |
| **packages/log** | TypeScript | 提供结构化 JSON 日志能力，适配 Browser/Node/Worker 环境。 |

### 分层结构

- **表现层**: `apps/frontend` (UI/UX)
- **网关/业务层**: `apps/backend` (API, Auth, Orchestration)
- **计算服务层**: `services/meridian-ml-service` (AI Compute), `Cloudflare Workflows` (Async Processing)
- **数据访问层**: `packages/database` (Shared Schema)
- **基础设施**: `PostgreSQL` (Metadata/Vector), `Cloudflare R2` (Blob Storage)

---

## 构建与环境

### 运行与开发

```bash
# 1. 安装依赖 (Root)
pnpm install

# 2. 启动所有服务 (推荐)
# 自动启动 Frontend (3000), Backend (8787), ML Service (8000) 并处理环境变量
node start_all.js

# 3. 单独开发某个包
pnpm --filter @meridian/backend dev
pnpm --filter @meridian/frontend dev
```

### 环境依赖

- **Node.js**: >= 20.x
- **pnpm**: >= 9.x
- **Python**: >= 3.11 (用于 ML Service)
- **Docker** (可选): 用于本地运行 PostgreSQL 或 ML Service 容器。

---

## 代码风格规范

### TypeScript / JavaScript

- **规范**: ESLint + Prettier (或 Biome)。
- **导入**: 优先使用 workspace 协议或别名引用。
  ```typescript
  // 推荐
  import { schema } from '@meridian/database';
  import { Logger } from '@meridian/logger';
  ```
- **类型**: 严禁使用 `any`，必须定义 Interface 或 Zod Schema。

### Python (ML Service)

- **规范**: PEP 8。
- **工具**: `ruff` (Linter/Formatter), `mypy` (Type Checking)。
- **依赖**: 使用 `uv` 或 `pip` 管理 `pyproject.toml`。

---

## 文档修改工作流程

**重要**：所有代码修改必须遵循以下审核流程（原则与原 StarryB 规范保持一致，适配 Web 开发上下文）：

1. **需求分析阶段**：接收需求，分析涉及服务与包（如 Frontend + Backend + DB）。
2. **修改计划阶段**（必须先执行）：列出修改计划，等待用户审核批准。
3. **审核批准阶段**：用户审核并明确批准后再继续。
4. **执行修改阶段**：按计划修改，完成 Lint 检查与测试。
5. **验证阶段**：在本地环境验证全链路功能。

### 文档命名规范（必须遵守）

- **01-我的需求**：`我的需求.md`，追加原始需求。
- **02-PRD**：`PRD-[范围]-主题-YYYYMMDD.md`
- **04-设计文档**：`DD-[范围]-主题-YYYYMMDD.md`
- **范围标识**:
  - `-WEB-`: 前端相关
  - `-API-`: 后端 API/Worker 相关
  - `-ML-`: 机器学习服务相关
  - `-DB-`: 数据库/Schema 相关
  - `-SYS-`: 系统级/DevOps 相关

### 需求映射与一致性

1.  **一对一映射**：PRD 条目必须对应 `我的需求.md` 中的编号。
2.  **模块化归口**：
    *   **Frontend**: `docs/02-产品需求文档PRD/PRD-WEB-*.md`
    *   **Backend**: `docs/02-产品需求文档PRD/PRD-API-*.md`
    *   **Schema/DB**: `docs/02-产品需求文档PRD/PRD-DB-*.md`

### 修复 Bug 的完整流程

**需求 → PRD → 设计 → 实现 → 经验手册 → 开发记录**

1.  在 `我的需求.md` 描述 Bug。
2.  编写/更新 PRD 定义修复目标。
3.  编写设计文档（分析根因，设计修复方案）。
4.  代码实现与验证。
5.  更新 `docs/05-经验手册` 沉淀知识。

---

## 扩展性设计

### 新增数据源类型

1.  在 `packages/database/src/schema.ts` 更新 Enum 定义。
2.  在 `apps/backend/src/durable_objects/` 创建新的 DO 或扩展现有逻辑。
3.  在 `apps/frontend` 更新配置表单。

### 新增 API 接口

1.  在 `apps/backend/src/routers/` 定义新的 Hono 路由。
2.  在 `packages/database` 定义所需的 Zod Validator。
3.  在前端 `apps/frontend/src/composables` 封装调用。

### 数据库变更

1.  修改 `packages/database/src/schema.ts`。
2.  运行 `pnpm --filter @meridian/database generate` 生成 SQL 迁移文件。
3.  运行 `pnpm --filter @meridian/database migrate` 应用到本地/生产数据库。

---

## 错误处理与日志

### 日志规范

- **统一库**: 所有服务必须使用 `@meridian/logger`。
- **级别**:
  - `ERROR`: 导致请求失败或系统异常的错误（必须包含 Stack Trace）。
  - `WARN`: 预期外的状态但不影响核心流程（如 RSS 解析部分失败）。
  - `INFO`: 关键业务节点（如 "Workflow Started", "Article Saved"）。
  - `DEBUG`: 详细调试信息（仅开发环境开启）。

### 错误响应

- **API**: 统一返回 JSON 格式错误。
  ```json
  {
    "success": false,
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "Source with ID 123 not found"
    }
  }
  ```

---

## 提示词编写规范（08-提示词）

将对话中「用户」的提示词沉淀到 **docs/08-提示词**。**仅在用户明确提出记录提示词时执行**。
- 格式：`提示词-YYYYMMDD.md`
- 结构：概括 + 原始提示词列表。
