# 03-架构设计

本目录存放 Meridian 项目的系统架构、技术选型与模块设计文档。

## 文档列表

| 文档名称 | 描述 | 状态 |
| :--- | :--- | :--- |
| **[01-系统总体架构.md](./01-系统总体架构.md)** | **核心文档**。定义了系统逻辑架构、数据流向、核心模块（Frontend, Backend, ML, DB）职责与技术栈。 | ✅ 已完成 |
| **[07-打包系统架构设计.md](./07-打包系统架构设计.md)** | 描述 Monorepo 的构建流程、Docker 容器化方案与部署架构。 | 🚧 待完善 |

## 架构决策记录 (ADR)

*在此记录关键架构决策（如选择 Cloudflare Workers, Drizzle, pgvector 的原因）。*

1.  **Monorepo**: 选用 Turborepo + pnpm，统一管理全栈代码。
2.  **Compute**: 选用 Cloudflare Workers (Serverless) + Python (ML Service) 混合架构。
3.  **Storage**: 选用 PostgreSQL (Structured + Vector) + R2 (Blob) 分层存储。
