# Fetch失效问题分析报告

**日期**: 2026-02-14
**分析人**: AI Assistant
**状态**: 完成

## 1. 问题描述
用户反馈 Admin 面板中显示的 "Next Fetch" 时间（如 `2026-02-14 10:48:48`）已经过去，但：
1.  "Last Fetch" 状态仍为 **Never**。
2.  后端日志中无任何抓取（Fetch）或解析（Parse）相关的记录。
3.  系统似乎完全忽略了抓取任务。

## 2. 现象分析

### 2.1 UI 显示逻辑
根据代码 `apps/frontend/src/server/api/admin/sources/index.get.ts`：
```typescript
nextFetchAt: source.lastChecked && source.scrape_frequency_minutes
  ? new Date(new Date(source.lastChecked).getTime() + source.scrape_frequency_minutes * 60 * 1000).toISOString()
  : new Date(Date.now()).toISOString(), // <--- 关键点
```
*   当 `source.lastChecked` 为 `null` (即 Never) 时，API 会默认返回 `Date.now()` 作为下一次抓取时间。
*   **结论**：UI 显示的时间并非来自数据库中存储的“计划时间”，而是动态计算的。它实际上在表达：“从未抓取过，应该**立即**抓取”。

### 2.2 后端调度机制
后端使用 Cloudflare Durable Objects (DO) 的 Alarms 进行调度 (`apps/backend/src/durable_objects/dataSourceIngestorDO.ts`)：
1.  **初始化**: 调用 `initialize()` 方法时，会设置第一个 Alarm (`Date.now() + 5000`)。
2.  **循环**: Alarm 触发 `alarm()` 方法，执行抓取，并设定下一次 Alarm。

### 2.3 日志排查
检查 `logs/backend-*.log`，发现只有启动日志，没有任何 DO 相关的 `[SourceScraperDO]` 日志。
这表明 **Durable Object 的 Alarm 根本没有触发**。

## 3. 根因定位

**根本原因：数据源未在 Durable Object 中初始化 (Uninitialized DOs)**

1.  **场景复现**: 如果数据源是通过 SQL 脚本直接插入数据库，或者在 DO 代码部署前存在的，它们仅仅存在于 PostgreSQL 中。
2.  **缺失环节**: 每个源对应一个 DO 实例。如果未调用 API `/admin/source/:id/init` 或 `/admin/initialize-dos`，对应的 DO 实例从未被创建，也就从未设置过 `ctx.storage.setAlarm()`。
3.  **静默失效**: DO 模型是“按需激活”的。如果没有外部请求（HTTP 或 Alarm）唤醒它，它就是沉睡的。数据库里的记录不会自动唤醒 DO。

## 4. 解决方案

### 4.1 临时修复（手动触发）
可以手动调用后端管理接口来批量初始化所有源的 DO：

```bash
# POST 请求触发所有源的初始化
curl -X POST http://localhost:8787/durable-objects/admin/initialize-dos \
  -H "Authorization: Bearer <API_TOKEN>"
```

### 4.2 长期修复（代码优化）
建议在 Admin 面板增加“初始化/重置调度”按钮，或在后端启动时增加自动检查机制（但需注意避免大规模冷启动风暴）。

## 5. 验证建议
执行初始化操作后，应能在日志中看到：
```
[SourceScraperDO] Initializing with data...
[SourceScraperDO] Initial alarm set.
```
随后 UI 的 "Last Fetch" 将更新为当前时间。
