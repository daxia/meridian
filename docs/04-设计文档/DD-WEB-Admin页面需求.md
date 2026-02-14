---
doc_type: design
doc_id: DD-WEB-Admin页面需求
status: approved
related_prd:
  - PRD-WEB-Admin页面需求
created: 2026-02-14
updated: 2026-02-14
---
# DD-WEB-Admin页面需求

## 1. 概述

本设计文档旨在解决 Admin Panel "Source Analytics" 列表中的数据显示异常问题，包括日期格式化错误 (NaN)、统计比率错误 (N/A%) 以及源名称缺失 (Unknown)。修复方案涉及前端展示逻辑增强与后端数据源名称自动补全。

## 2. 变更记录

- **2026-02-14**: [20260214001] 完成设计与实现。

---

## PRD-需求1：Admin Panel 数据显示修复 (已完成)

### 概述

修复 Admin Panel 中影响数据可读性的三个核心问题：
1.  **日期显示**: 修复 `NaN-NaN-NaN` 问题。
2.  **比率计算**: 修复分母为 0 或数据缺失导致的 `N/A%` 问题。
3.  **源名称**: 解决新增 RSS 源默认为 "Unknown" 的问题，实现从 URL 或 RSS 内容自动获取名称。

### 目标与约束

- **目标**: 提升 Admin Panel 数据准确性与可读性。
- **约束**:
    - 兼容现有数据库 Schema，尽量减少 Schema 变更。
    - 前端显示逻辑需具备鲁棒性，能够处理后端返回的 `null` 或非法值。

### 功能设计

#### 1. 前端显示逻辑增强 (Frontend)

在 `apps/frontend/src/pages/admin/index.vue` 中优化数据绑定逻辑：

- **日期格式化 (`formatDate`)**:
    - 增加对 `null` / `undefined` 的检查。
    - 增加对 `Invalid Date` (`Number.isNaN(date.getTime())`) 的检查。
    - 异常情况统一返回 "Never"。
- **比率显示**:
    - 使用 `(value ?? 0).toFixed(1)` 确保数值存在。
    - 默认值设为 0，避免 undefined 导致渲染为空。

#### 2. 源名称自动补全 (Backend & Frontend)

采取 "双重保障" 策略确保 Source Name 有值：

1.  **前端创建时回退 (Frontend API)**:
    - 在 `apps/frontend/src/server/api/admin/sources/index.post.ts` 中。
    - 若用户未输入名称，默认使用 RSS URL 的 Hostname (如 `feed.xml` -> `example.com`) 作为初始名称，而非硬编码的 "Unknown"。

2.  **后端采集时更新 (Backend DO)**:
    - 在 `apps/backend/src/durable_objects/dataSourceIngestorDO.ts` 中。
    - 在首次成功解析 RSS Feed 时，从 XML 中提取 `<title>`。
    - 若数据库中当前名称为 "Unknown" 或与 URL Hostname 相同（即由步骤 1 生成的临时名称），则自动更新为 RSS Feed 的真实标题。

3.  **解析器增强**:
    - 修改 `apps/backend/src/lib/parsers.ts` 中的 `parseRSSFeed`，使其返回 `items` 的同时返回 channel `title`。

### 详细设计

#### 类图/数据流

```mermaid
sequenceDiagram
    participant User
    participant FrontendAPI
    participant DB
    participant DO as DataSourceIngestorDO
    participant Parser

    User->>FrontendAPI: Add Source (URL only)
    FrontendAPI->>FrontendAPI: Extract Hostname
    FrontendAPI->>DB: Insert Source (name=Hostname)
    
    loop Every 15min
        DO->>DO: Fetch RSS XML
        DO->>Parser: parseRSSFeed(xml)
        Parser-->>DO: { items: [...], title: "Real Title" }
        DO->>DB: Update Source Name = "Real Title"
        DO->>DB: Save Articles
    end
```

### 接口与数据结构

- **`parseRSSFeed` 返回值变更**:
  ```typescript
  // Before
  Promise<Result<z.infer<typeof rssFeedSchema>[], Error>>
  
  // After
  Promise<Result<{ items: z.infer<typeof rssFeedSchema>[]; title?: string }, Error>>
  ```

### 异常与边界

- **RSS 无标题**: 若 XML 中无 `<title>`，保持原有名称（Hostname）。
- **日期解析失败**: 前端显示 "Never"，不中断页面渲染。

### 变更清单

1.  `apps/frontend/src/pages/admin/index.vue`: 修改 `formatDate` 和 Template 插值逻辑。
2.  `apps/frontend/src/server/api/admin/sources/index.post.ts`: 修改默认名称生成逻辑。
3.  `apps/backend/src/lib/parsers.ts`: 修改 `parseRSSFeed` 提取 title。
4.  `apps/backend/src/durable_objects/dataSourceIngestorDO.ts`: 增加更新 Source Name 的 SQL 逻辑。

### 测试与验证要点

1.  **新建源测试**: 添加一个只有 URL 的源，确认初始名称为 Hostname。
2.  **采集测试**: 触发采集（或等待自动采集），确认名称自动更新为 RSS 标题。
3.  **UI 测试**: 查看 Admin 列表，确认无 `NaN` 或 `N/A` 出现。

### 设计疑问

- **Q**: 是否需要强制用户输入名称？
- **A**: 不需要，为了体验流畅，允许只输 URL，系统自动发现名称更佳。

### 设计审核报告

（记录审核人、时间、结论）

---

## PRD-需求2：Admin Panel 抓取时间列增强 (已完成)

### 概述

为了提供更精确的运维监控能力，Admin Panel 需展示每个 RSS 源的**最后抓取时间 (Last Fetch)** 和 **下次计划抓取时间 (Next Fetch)**。本设计涉及后端计算逻辑的增强与前端表格列的扩展。

### 目标与约束

- **目标**: 让管理员直观了解抓取任务的调度状态（是否滞后、何时执行）。
- **约束**:
    - `nextFetchAt` 不存储在数据库，而是由后端 API 实时计算返回。
    - 保持表格布局整洁，避免信息过载。

### 功能设计

#### 1. 后端 API 增强 (Backend)

- **API**: `GET /api/admin/sources`
- **逻辑**:
    - 遍历所有 Sources。
    - 计算 `nextFetchAt`:
        ```typescript
        const lastChecked = source.lastCheckedAt ? new Date(source.lastCheckedAt).getTime() : 0;
        const intervalMs = (source.scrapeFrequencyMinutes || 60) * 60 * 1000;
        const nextFetchAt = lastChecked > 0 ? new Date(lastChecked + intervalMs) : new Date(Date.now()); // 如果从未抓取，假定立即执行
        ```
    - 将 `nextFetchAt` 添加到响应对象中。

#### 2. 前端表格扩展 (Frontend)

- **文件**: `apps/frontend/src/pages/admin/index.vue`
- **变更**:
    - **Header**: 新增 "Last Fetch" 和 "Next Fetch" 表头。
    - **Data Row**:
        - **Last Fetch**: 绑定 `source.lastCheckedAt`。格式化为 `YYYY-MM-DD HH:mm:ss`。
        - **Next Fetch**: 绑定 `source.nextFetchAt`。格式化为 `YYYY-MM-DD HH:mm:ss`。
    - **Sort**: 支持按 `nextFetchAt` 排序。

### 详细设计

#### 类图/数据流

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant BackendAPI
    participant DB

    User->>Frontend: Open Admin Panel
    Frontend->>BackendAPI: GET /api/admin/sources
    BackendAPI->>DB: Select * from sources
    DB-->>BackendAPI: List[Source]
    BackendAPI->>BackendAPI: Calculate nextFetchAt for each source
    BackendAPI-->>Frontend: List[SourceWithNextFetch]
    Frontend->>Frontend: Render Table with new columns
```

### 接口与数据结构

- **Response DTO**:
  ```typescript
  interface AdminSourceItem {
      id: string;
      name: string;
      url: string;
      lastCheckedAt: string | null;
      scrapeFrequencyMinutes: number;
      // ... other fields
      nextFetchAt: string; // ISO 8601 Date String
  }
  ```

### 异常与边界

- **从未抓取**: `lastCheckedAt` 为 null。
    - `Last Fetch` 显示 "Never"。
    - `Next Fetch` 显示当前时间（表示应立即抓取）。
- **已过期 (Overdue)**: 当前时间 > `nextFetchAt`。
    - 前端暂不作特殊红色高亮，通过 `Next Fetch` 时间早于当前时间可推断。

### 变更清单

1.  `apps/frontend/src/server/api/admin/sources/index.get.ts`: 修改 `GET /sources` 路由处理函数，注入 `nextFetchAt`。
2.  `apps/frontend/src/pages/admin/index.vue`:
    - 修改 `<Table>` 结构，增加两列。
    - 使用 `formatDate` 格式化时间。
    - 增加 `nextFetchAt` 排序逻辑。

### 测试与验证要点

1.  **时间准确性**: 验证 `Next Fetch` = `Last Fetch` + `Frequency`。
2.  **UI 适配**: 确认新增列后表格不换行错乱。
3.  **排序**: 点击 "Next Fetch" 表头，列表应按时间排序。
