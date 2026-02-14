# 07-运维手册

本目录存放系统的部署、配置、监控、备份与恢复等标准操作程序 (SOP)。

## 文档列表

| 文档名称 | 描述 |
| :--- | :--- |
| **[01-系统运维手册.md](./01-系统运维手册.md)** | **基础运维手册**。包含环境准备、本地启动、生产部署 (Wrangler)、常见运维命令与故障排查流程。 |

## 核心运维领域

### 1. 部署 (Deployment)
- **本地开发**: `node start_all.js`
- **生产发布**: 
  - Backend: `pnpm run deploy:backend` (Wrangler)
  - Frontend: `pnpm run deploy:frontend` (Vercel/Netlify/Pages)

### 2. 配置管理 (Configuration)
- **环境变量**: `.env` (本地) vs Cloudflare Secrets (生产)。
- **密钥管理**: 数据库连接串、API Keys。

### 3. 监控与日志 (Observability)
- **日志**: 使用 `@meridian/logger`，生产环境日志流向 Cloudflare Logs 或外部聚合平台。
- **健康检查**: `/health` 端点监控服务存活状态。

### 4. 数据运维 (Data Ops)
- **数据库迁移**: `drizzle-kit migrate`
- **备份策略**: 定期导出 PostgreSQL 数据；R2 具备多重冗余。
