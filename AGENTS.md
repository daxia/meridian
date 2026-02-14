# Meridian AI News Aggregator - 开发规范

文档工作流、状态机、Agent 权限等以 **`.cursor/rules/docs-agents_v1.md`** 为准；**文档审核门控**以 **docs/_policies/doc-review-gate.policy.md** 为准。本文描述**本仓库（Meridian）**的代码架构、构建、风格与扩展方式。

---

## 项目架构

项目架构设计、目录结构与职责划分，请参考根目录 **`README.md`** 或 **`docs/03-架构设计/README.md`**。

---

## 构建与环境

环境依赖安装、启动脚本与开发指南，请参考根目录 **`README.md`** 中的 "Getting Started" 章节。

---

## 代码风格规范

具体语言（TypeScript/Python）的代码风格、Linter 配置及工具链说明，请参考 **`docs/05-经验手册/README.md`** 或根目录的贡献指南。

---

## 文档修改工作流程

**重要**：所有代码修改必须遵循以下审核流程（原则与原 StarryB 规范保持一致，适配 Web 开发上下文）：

1.  **需求分析阶段**：接收需求，分析涉及服务与包（如 Frontend + Backend + DB）。
2.  **文档定位阶段**：
    *   **优先合并**：检查 `docs/` 下现有文档，将新需求合并至对应模块的 PRD/DD 中（如日志相关合并至 `PRD-SYS-日志功能需求.md`）。
    *   **申请新建**：仅在无匹配模块时，向用户申请新建文档。禁止随意创建碎片化文档。
3.  **修改计划阶段**（必须先执行）：列出修改计划，等待用户审核批准。
4.  **审核批准阶段**：用户审核并明确批准后再继续。
5.  **执行修改阶段**：按计划修改，完成 Lint 检查与测试。
6.  **验证阶段**：在本地环境验证全链路功能。

### 文档命名与归口规范

请始终参考各子目录下的 **README.md** 以确定命名规范与职责归口：

*   **需求归口**：请查阅 **`docs/02-产品需求文档PRD/README.md`** 确定 PRD 归口。
*   **设计归口**：请查阅 **`docs/04-设计文档/README.md`** 确定 DD 归口。
*   **经验沉淀**：请查阅 **`docs/05-经验手册/README.md`** 确定手册命名规范。
*   **运维操作**：请查阅 **`docs/07-运维手册/README.md`** 确定 SOP 规范。

### 需求映射与一致性

1.  **一对一映射**：PRD 条目必须对应 `我的需求.md` 中的编号。
2.  **需求保留原则**（新增）：**严禁删除** `我的需求.md` 中已完成或废弃的需求。所有需求应永久保留以作为项目历史记录。新需求应追加在文档末尾。
3.  **模块化归口**（PRD 与 DD 均须遵守）：
    *   **动态查找**：请始终参考 **`docs/02-产品需求文档PRD/README.md`** 中的文档职责说明表格，确定当前需求应归入哪个 PRD 文档。
    *   **严禁碎片化**：仅在 README.md 未覆盖当前需求领域时，才可申请新建 PRD（并需同步更新 README.md）。
    *   **命名规范**：遵循 README.md 中定义的命名体系（如 `PRD-API-核心服务需求.md`），而非随意命名。

### 模板规范（严格执行）

PRD 和 DD 必须严格遵循 **`.cursor/rules/docs-agents_v1.md`** 中定义的 Markdown 模板（包含 YAML Header、变更记录、需求编号等），**严禁使用自由格式**。

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

详细的日志规范与错误处理策略，请参考 **`docs/05-经验手册/README.md`** 中的相关技术规范或 **`PRD-SYS-日志功能需求.md`**。

---

## 提示词编写规范（08-提示词）

请参考 **`docs/08-提示词/README.md`**。
