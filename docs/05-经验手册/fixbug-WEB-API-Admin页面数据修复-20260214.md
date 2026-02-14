# fixbug-WEB-API-Admin页面数据修复

## 1. 问题描述

在 Admin Panel 的 "Source Analytics" 列表中，观察到以下数据显示异常：
1.  **日期显示错误**: "LAST CHECKED" 列显示为 `NaN-NaN-NaN`。
2.  **比率显示错误**: "ERROR RATE" 和 "SUCCESS RATE" 显示为 `N/A%`。
3.  **源名称缺失**: 新添加的 RSS 源名称默认为 "Unknown"，且采集后未更新。

## 2. 根因分析

### 2.1 日期 NaN 问题
前端 `formatDate` 函数直接使用 `new Date(dateStr)`，但未对 `null`、`undefined` 或非标准日期字符串进行校验。当后端返回空值时，`Date` 对象变为 `Invalid Date`，导致 `getTime()` 返回 `NaN`，最终渲染失败。

### 2.2 比率 N/A 问题
计算成功率/错误率时，直接执行除法 `(count / total) * 100`。当 `total` 为 0（即新源尚未采集过）时，结果为 `NaN` 或 `Infinity`，`.toFixed(1)` 处理后变成 "NaN" 或 "N/A"。

### 2.3 源名称 Unknown 问题
- **入库阶段**: 用户仅输入 URL，后端接口默认将 `name` 字段设为硬编码的 "Unknown"。
- **采集阶段**: `parseRSSFeed` 函数仅关注 `items` (文章列表)，未提取 Channel 级别的 `<title>` 元素。导致即使采集成功，数据库中的源名称也永远不会被更新。

## 3. 解决方案

### 3.1 前端防御性编程
在 `apps/frontend/src/pages/admin/index.vue` 中：
- 修改 `formatDate`: 增加 `if (!dateStr || Number.isNaN(new Date(dateStr).getTime())) return 'Never';`。
- 模板插值: 使用 `(source.errorRate ?? 0).toFixed(1)` 并确保分母不为 0。

### 3.2 后端智能补全
- **API 层**: `apps/frontend/src/server/api/admin/sources/index.post.ts` 中，若无名称则解析 URL Hostname 作为临时名称 (如 `example.com`)。
- **Parser 层**: `apps/backend/src/lib/parsers.ts` 修改解析逻辑，提取 `<title>`。
- **调度层**: `apps/backend/src/durable_objects/dataSourceIngestorDO.ts` 在采集成功后，若当前名称为 Unknown/Hostname，则更新为 RSS 真实标题。

## 4. 经验教训

1.  **UI 鲁棒性**: 前端展示层必须假设后端数据可能为空或非法，永远不要直接对未经验证的数据调用方法（如 `toFixed`, `getTime`）。
2.  **元数据价值**: 在采集类应用中，第一时间获取并持久化元数据（如 Site Title, Icon）对用户体验至关重要，不应留到后续处理。
3.  **渐进式增强**: 对于必填项（如 Source Name），若用户未填，系统应提供合理的默认值（Hostname）并尝试自动修正（RSS Title），而不是简单的 "Unknown"。
