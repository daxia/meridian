# DD-API-核心服务需求

## 1. 概述

本设计文档对应 `PRD-API-核心服务需求.md`，负责定义后端核心服务（Hono API, Workflows, Durable Objects）的详细设计。

## 2. 变更记录

- 2026-02-14:
  初始化文档，设计情报汇总自动化流程。

---

## PRD-需求1：情报汇总自动化流程 (待实现)

#### 需求编号：20260214007

### 概述

设计一个基于 Cloudflare Workflows 的自动化管线，串联 DB、ML Service 和 LLM，生成 Intelligence Brief。

### 目标与约束

- **目标**: 稳定、容错的异步处理流。
- **约束**: ML Service 可能处理较慢，需使用 Workflow 的 `step.do` 机制避免超时。

### 功能设计

1.  **Cron Trigger**: 在 `wrangler.jsonc` 中配置 Cron。
2.  **Workflow**: `GenerateBriefWorkflow`。
3.  **API Client**: 封装调用 ML Service `/cluster` 接口的 Client。

### 详细设计

#### 1. 工作流步骤 (Workflow Steps)

```typescript
export class GenerateBriefWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // Step 1: 获取未汇总文章
    const articles = await step.do('fetch-articles', async () => {
      // select from articles where created_at > last_report_time
    });

    // Step 2: 调用 ML 进行聚类
    const clusters = await step.do('cluster-articles', async () => {
      // POST http://ml-service/cluster
    });

    // Step 3: LLM 总结
    const reportContent = await step.do('summarize', async () => {
      // Call Google Gemini API
    });

    // Step 4: 保存
    await step.do('save-report', async () => {
       // insert into reports
    });
  }
}
```

### 接口与数据结构

| 接口 | 方法 | 路径 | 描述 |
| :--- | :--- | :--- | :--- |
| **ML Cluster** | POST | `/cluster` | 输入文章列表（含 Embeddings），输出聚类结果。 |

### 异常与边界

- **无文章**: 若时间段内无新文章，直接跳过生成。
- **ML 服务不可用**: Workflow 应重试或失败报警。

### 变更清单

| 模块 | 文件 | 说明 |
| :--- | :--- | :--- |
| Backend | `src/workflows/generateBrief.workflow.ts` | 新增工作流 |
| Backend | `wrangler.jsonc` | 注册 Workflow 和 Cron |
| ML Service | `main.py` | 新增 `/cluster` 接口 |