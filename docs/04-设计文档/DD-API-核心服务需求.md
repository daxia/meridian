# DD-API-核心服务需求

## 1. 概述

本设计文档对应 `PRD-API-核心服务需求.md`，负责定义后端核心服务（Hono API, Workflows, Durable Objects）的详细设计。

## 2. 变更记录

- 2026-02-14:
  - 初始化文档，设计情报汇总自动化流程（需求1）。
  - 新增简报生成失败诊断与修复设计（需求2）。

---

## PRD-需求1：情报汇总自动化流程 (已完成)

#### 需求编号：20260214007

### 概述

设计一个基于 Cloudflare Workflows 的自动化管线，串联 DB、ML Service 和 LLM，生成 Intelligence Brief。

### 目标与约束

- **目标**: 稳定、容错的异步处理流。
- **约束**: ML Service 可能处理较慢，需使用 Workflow 的 `step.do` 机制避免超时。

### 功能设计

1. **Cron Trigger**: 在 `wrangler.jsonc` 中配置 Cron。
2. **Workflow**: `GenerateBriefWorkflow`。
3. **API Client**: 封装调用 ML Service `/cluster` 接口的 Client。

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

| 接口                 | 方法 | 路径         | 描述                                          |
| :------------------- | :--- | :----------- | :-------------------------------------------- |
| **ML Cluster** | POST | `/cluster` | 输入文章列表（含 Embeddings），输出聚类结果。 |

### 异常与边界

- **无文章**: 若时间段内无新文章，直接跳过生成。
- **ML 服务不可用**: Workflow 应重试或失败报警。

### 变更清单

| 模块       | 文件                                        | 说明                   |
| :--------- | :------------------------------------------ | :--------------------- |
| Backend    | `src/workflows/generateBrief.workflow.ts` | 新增工作流             |
| Backend    | `wrangler.jsonc`                          | 注册 Workflow 和 Cron  |
| ML Service | `main.py`                                 | 新增 `/cluster` 接口 |

---

## PRD-需求2：简报生成失败诊断与修复 (待实现)

#### 需求编号：20260214014

### 概述

设计诊断工具和修复机制，解决 GenerateBriefWorkflow 无法找到符合条件的文章的问题，恢复简报生成功能。

### 目标与约束

- **目标**: 快速定位文章处理问题，提供批量修复能力
- **约束**:
  - 不破坏现有数据
  - 保持向后兼容
  - 遵循最小化改动原则

### 功能设计

1. **文章状态诊断 API**: 提供数据库文章状态统计和详细信息
2. **ML Service 健康检查**: 验证 ML Service 可用性
3. **批量重新处理 API**: 支持按状态批量重新处理文章

### 详细设计

#### 1. 文章状态诊断 API

**端点**: `GET /api/admin/diagnostic/articles-status`

**查询逻辑**:

```typescript
// 统计各状态数量
SELECT status, COUNT(*) as count
FROM ingested_items
GROUP BY status;

// 最近 PROCESSED 文章（含 embedding 信息）
SELECT id, display_title, processed_at, embedding IS NOT NULL as has_embedding
FROM ingested_items
WHERE status = 'PROCESSED'
ORDER BY processed_at DESC
LIMIT 10;

// 最近 FAILED 文章（含失败原因）
SELECT id, display_title, status, fail_reason, processed_at
FROM ingested_items
WHERE status LIKE 'FAILED%'
ORDER BY processed_at DESC
LIMIT 10;
```

#### 2. ML Service 健康检查

**端点**: `GET /api/admin/diagnostic/ml-health`

**实现**:

```typescript
const startTime = Date.now();
try {
  const response = await fetch(`${env.MERIDIAN_ML_SERVICE_URL}/health`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${env.MERIDIAN_ML_SERVICE_API_KEY}`
    }
  });
  const responseTime = Date.now() - startTime;
  return {
    status: response.ok ? 'healthy' : 'unhealthy',
    message: response.ok ? 'ML Service 正常' : await response.text(),
    response_time_ms: responseTime
  };
} catch (error) {
  return {
    status: 'unhealthy',
    message: error.message,
    response_time_ms: Date.now() - startTime
  };
}
```

#### 3. 批量重新处理 API

**端点**: `POST /api/admin/articles/reprocess-batch`

**实现逻辑**:

```typescript
export type ReprocessBatchRequest = {
  status?: string[];  // 默认: ['NEW', 'FAILED_FETCH', 'FAILED_RENDER']
  limit?: number;     // 默认: 100
};

export type ReprocessBatchResponse = {
  success: boolean;
  message: string;
  count: number;
  workflow_id?: string;
};

async function reprocessBatch(c: HonoContext): Promise<Response> {
  const { status = ['NEW', 'FAILED_FETCH', 'FAILED_RENDER'], limit = 100 } = await c.req.json();

  // 查询符合条件的文章
  const articles = await db
    .select({ id: $ingested_items.id })
    .from($ingested_items)
    .where(inArray($ingested_items.status, status))
    .limit(limit);

  if (articles.length === 0) {
    return c.json({ success: true, message: '无符合条件的文章', count: 0 });
  }

  // 调用工作流
  const result = await startProcessArticleWorkflow(c.env, {
    ingested_item_ids: articles.map(a => a.id)
  });

  if (result.isErr()) {
    return c.json({ error: '工作流创建失败', details: result.error.message }, 500);
  }

  return c.json({
    success: true,
    message: `已提交 ${articles.length} 篇文章处理`,
    count: articles.length,
    workflow_id: result.value.id
  });
}
```

### 接口与数据结构

| 接口                          | 方法 | 路径                                      | 描述                           |
| :---------------------------- | :--- | :---------------------------------------- | :----------------------------- |
| **文章状态诊断**        | GET  | `/api/admin/diagnostic/articles-status` | 返回文章状态统计和最近文章列表 |
| **ML Service 健康检查** | GET  | `/api/admin/diagnostic/ml-health`       | 检查 ML Service 可用性         |
| **批量重新处理**        | POST | `/api/admin/articles/reprocess-batch`   | 批量重新处理指定状态的文章     |

**响应数据结构**:

```typescript
// 文章状态诊断响应
interface ArticlesStatusResponse {
  status_counts: Record<string, number>;
  recent_processed: Array<{
    id: number;
    title: string | null;
    processed_at: Date | null;
    has_embedding: boolean;
  }>;
  recent_failed: Array<{
    id: number;
    title: string | null;
    status: string;
    fail_reason: string | null;
    processed_at: Date | null;
  }>;
}

// ML Service 健康检查响应
interface MLHealthResponse {
  status: 'healthy' | 'unhealthy';
  message: string;
  response_time_ms?: number;
}
```

### 异常与边界

- **诊断 API**:

  - 数据库查询失败：返回 500，记录日志
  - ML Service 连接超时：返回 503，标记 unhealthy
- **批量重新处理**:

  - 无符合条件的文章：返回成功，count=0
  - 工作流创建失败：返回 500，记录错误
- **边界条件**:

  - 列表查询限制 10 条
  - 批量处理限制 100 条
  - 所有诊断 API 需认证 token

### 变更清单

| 模块     | 文件                                     | 说明                            |
| :------- | :--------------------------------------- | :------------------------------ |
| Backend  | `src/routers/admin.router.ts`             | 新增诊断 API 和批量重新处理 API |
| Frontend | `src/pages/admin.vue` 或 `src/components/DiagnosticPanel.vue` | 新增诊断页面或组件               |

### 设计疑问

#### 问题1：前端 Admin 界面是否需要新增诊断页面？

- **推荐**: 新增诊断页面，提升用户体验。
- **优劣说明**:
  - 新增页面：用户友好，但需要前端开发工作
  - 控制台查看：快速实现，但体验较差

> **需求方回答**：
>
> （需求方在此填写）
> 使用推荐

#### 问题2：批量重新处理是否需要支持指定时间范围？

- **推荐**: 暂不支持，先实现基础功能。如需要可后续迭代。
- **优劣说明**:
  - 支持：灵活性高，但复杂度增加
  - 不支持：实现简单，满足大部分场景

> **需求方回答**：
>
> （需求方在此填写）
> 暂不支持

#### 问题3：ML Service 健康检查是否需要测试 embedding 生成接口？

- **推荐**: 仅检查 HTTP 连接性，不实际生成 embedding（避免消耗资源）。
- **优劣说明**:
  - 测试生成：更准确验证功能，但消耗资源
  - 仅检查连接：快速，节省资源

> **需求方回答**：
>
> （需求方在此填写）
> 推荐

### 设计审核报告

**审核状态**: 批准 ✓
**审核日期**: 2026-02-14
**审核人**: Agent

**审核结论**:

✅ **设计文档已完善，可以进入实现阶段**

**用户回答记录**:
- 问题1：使用推荐（新增诊断页面）
- 问题2：暂不支持（不支持时间范围）
- 问题3：推荐（仅检查 HTTP 连接性）

**补充说明**:
- 由于选择新增诊断页面，已在变更清单中补充前端文件
- 实现时需注意 API 认证和错误处理
- 遵循最小化改动原则，不破坏现有功能
