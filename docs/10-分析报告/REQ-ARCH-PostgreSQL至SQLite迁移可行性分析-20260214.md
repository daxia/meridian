---
title: PostgreSQL 至 SQLite (Cloudflare D1) 迁移可行性分析
date: 2026-02-14
author: AI Assistant
status: Draft
---

# PostgreSQL 至 SQLite (Cloudflare D1) 迁移可行性分析

## 1. 背景与目标

当前 Meridian 项目使用 PostgreSQL 作为核心数据库，利用 Cloudflare Hyperdrive 进行连接池管理。项目中使用了 PostgreSQL 的高级特性，包括 `pgvector`（向量存储与检索）、`jsonb`（结构化数据存储）和 `pgEnum`（枚举类型）。

用户希望评估将数据库迁移至 Cloudflare D1 (SQLite) 的可行性，以实现更纯粹的 Serverless 架构，降低运维成本和连接延迟。

## 2. 现有数据架构分析

基于 `packages/database/src/schema.ts` 的分析：

### 2.1 核心表结构
*   **$ingested_items**: 核心业务表。包含文章内容、元数据和 **384维向量 Embedding**。
*   **$data_sources**: 配置表，使用 JSONB 存储灵活配置。
*   **$reports**: 简报表，存储生成结果。
*   **$system_settings**, **$publishers**, **$newsletter**: 辅助表。

### 2.2 关键依赖特性
| 特性 | 当前实现 (PostgreSQL) | 用途 | 迁移难度 |
| :--- | :--- | :--- | :--- |
| **向量搜索** | `vector(384)` + HNSW Index | 语义搜索、相似文章推荐 | **极高 (Blocker)** |
| **JSON 处理** | `jsonb` | 存储 API 响应、灵活配置 | 中等 |
| **枚举类型** | `pgEnum` | 状态管理 (`NEW`, `PROCESSED` 等) | 低 |
| **自增主键** | `serial` / `bigserial` | ID 生成 | 低 |
| **时间处理** | `timestamp` | 记录时间 | 低 |

## 3. 迁移至 SQLite (Cloudflare D1) 的挑战与方案

### 3.1 核心挑战：向量搜索 (Vector Search)
**现状**：PostgreSQL 原生支持 `pgvector` 插件，允许在同一个事务中存储文本数据和向量数据，并进行高效的混合查询（Hybrid Search）。

**问题**：SQLite (D1) **不支持** 向量存储和相似度搜索。

**解决方案**：必须引入 **Cloudflare Vectorize**。
*   **架构变更**：
    *   **PostgreSQL**: 单一数据库，存数据 + 存向量。
    *   **D1 + Vectorize**: 
        *   **D1**: 存储文章元数据、内容、配置（关系型数据）。
        *   **Vectorize**: 存储 `id` 和 `vector`（向量索引）。
*   **代价**：
    *   **数据一致性**：开发者必须在应用层处理双写一致性（Distributed Transaction 模拟）。例如，插入 D1 成功但 Vectorize 失败，需要回滚 D1。
    *   **查询复杂化**：无法使用 SQL `JOIN`。需要先查 Vectorize 拿到 IDs，再用 `WHERE id IN (...)` 查 D1。

### 3.2 数据类型映射

| PostgreSQL | SQLite (D1) | 迁移策略 |
| :--- | :--- | :--- |
| `serial` / `bigserial` | `INTEGER PRIMARY KEY` | Drizzle ORM 可自动处理。注意 D1 的自增行为。 |
| `pgEnum` | `TEXT` | 移除 Enum 定义，改为应用层常量校验或 SQLite `CHECK` 约束。 |
| `jsonb` | `TEXT` | D1 支持 JSON 函数 (`json_extract`)，但在 ORM 层需声明为 `text` 并用 `mode: 'json'` 处理。 |
| `timestamp` | `INTEGER` (Unix) 或 `TEXT` (ISO) | 建议存储为 Unix Timestamp (Integer) 以提高性能，Drizzle 支持 `mode: 'date'` 自动转换。 |
| `boolean` | `INTEGER` (0/1) | 自动映射。 |

### 3.3 迁移工作量评估

1.  **Schema 重写 (1-2 天)**:
    *   移除 `pg-core` 依赖，替换为 `sqlite-core`。
    *   移除 `vector` 字段。
    *   将 `pgEnum` 转换为 TypeScript const + Check。
2.  **数据访问层 (DAO) 重构 (2-3 天)**:
    *   修改所有 Drizzle 查询。
    *   **重点**：重写所有涉及相似度搜索的逻辑 (`orderBy: sql`...`embedding`...`)。
3.  **引入 Vectorize (2-3 天)**:
    *   配置 Cloudflare Vectorize 绑定。
    *   实现向量数据的 CRUD 操作。
    *   实现“先搜向量，再搜数据库”的逻辑。
4.  **数据迁移脚本 (1-2 天)**:
    *   编写脚本从 Postgres 导出数据。
    *   将关系数据导入 D1。
    *   将向量数据导入 Vectorize。

## 4. 优缺点对比

### 方案 A: 保持 PostgreSQL (当前)
*   **优点**: 
    *   开发简单，单源真理 (Single Source of Truth)。
    *   事务支持完善。
    *   生态成熟，工具丰富。
*   **缺点**: 
    *   连接池 (Hyperdrive) 增加了一层复杂度。
    *   非 Serverless 原生（通常需要独立 VPS 或托管数据库），成本相对较高（如果不使用 Neon 等 Serverless PG）。

### 方案 B: 迁移至 D1 + Vectorize
*   **优点**:
    *   **完全 Serverless**: 无需维护数据库实例，自动扩缩容。
    *   **成本**: D1 和 Vectorize 在 Cloudflare 生态内成本极低（对于中小型应用）。
    *   **速度**: D1 在 Worker 内部访问极快（读取）。
*   **缺点**:
    *   **架构复杂**: 需要维护两个数据存储。
    *   **一致性风险**: 需处理部分失败的情况。
    *   **功能限制**: SQLite SQL 语法不如 Postgres 丰富（如缺乏复杂的窗口函数、复杂的 JSON 操作）。

## 5. 结论与建议

**结论**: 
技术上**可行**，但**不是平滑迁移**，而是**架构重构**。主要工作量在于剥离向量搜索逻辑。

**建议**:
1.  **如果当前痛点是“连接错误”或“配置麻烦”**：建议先优化 Hyperdrive 配置，或者尝试 Neon (Serverless Postgres)，它与当前架构 100% 兼容。
2.  **如果目标是“极致成本降低”或“纯 CF 技术栈”**：可以迁移。但需预留 **1-2 周** 的开发和测试时间，且需接受双存储架构带来的维护成本。

**推荐路线**:
若决定迁移，建议分步进行：
1.  先在代码中引入 Repository 模式，隔离数据库实现。
2.  在 Dev 环境搭建 D1 + Vectorize 原型，验证搜索效果。
3.  验证通过后再进行全量数据迁移。