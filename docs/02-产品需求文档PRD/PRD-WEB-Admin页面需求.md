---
doc_type: prd
doc_id: PRD-WEB-Admin页面需求
owner: frontend
related_requirement:
  - 20260214001
  - 20260214005
  - 20260214006
created: 2026-02-14
updated: 2026-02-14
---
# 产品需求文档（PRD）：Admin Panel 数据显示修复与增强

**需求来源**：docs/01-我的需求/我的需求.md

本文档针对的功能模块：Frontend (Admin Panel) & Backend (API)

---

## 1. 引言

### 1.1 背景
Admin Panel 是管理员监控 RSS 源抓取状态的核心界面。近期发现存在数据显示异常（NaN/N/A）、关键运维字段缺失（Last/Next Fetch）以及调度器未初始化导致抓取停滞的问题。

### 1.2 目标
修复显示错误，增强调度可观测性，并提供手动修复调度状态的工具，确保系统稳定运行。

---

## 2. 变更记录

- **2026-02-14**:
    - **需求编号**: 20260214006
    - **内容**: 新增 "初始化调度器" 按钮。
    - **目标**: 解决因 DO 未激活导致的抓取停滞问题。
  - **2026-02-14**:
    - **需求编号**: 20260214005
    - **内容**: 新增 "Last Fetch" 和 "Next Fetch" 列。
    - **目标**: 增强源抓取调度的可观测性。
  - **2026-02-14**:
    - **需求编号**: 20260214001
    - **内容**: 修复日期 NaN、百分比 N/A 及 Source Unknown 问题。
    - **目标**: 恢复 Admin Panel 数据可读性。

---

## 需求1：Admin Panel 数据显示修复 (已完成)

**需求编号**: 20260214001

**DD编号**: DD-WEB-Admin页面需求

### 1. 需求功能点

**1）列表字段显示优化**:

- **描述**: 优化 "Source Analytics" 表格中各列的显示逻辑。
- **UI/UX 交互**: 无交互变更，仅显示优化。
- **详细规则**:
    1.  **LAST CHECKED (上次检查时间)**:
        - 若有有效时间戳，格式化为 `YYYY-MM-DD HH:mm:ss`。
        - 若为 `null` / `undefined` / 0，显示 `Never`。
    2.  **ERROR RATE (错误率)**:
        - 若分母（总尝试次数）为 0，显示 `0%`。
        - 否则显示 `(Errors / Total * 100).toFixed(1)%`。
    3.  **SUCCESS RATE (成功率)**:
        - 若分母为 0，显示 `0%`。
        - 否则显示 `(Success / Total * 100).toFixed(1)%`。
    4.  **AVG/DAY (日均文章数)**:
        - 若无数据，显示 `0`。
        - 否则保留一位小数。
    5.  **SOURCE (源名称)**:
        - 确保前端正确绑定 Source Name 字段。
        - 若后端返回 name 为空，显示 `Unnamed Source (ID: xxx)`。

**2）边界情况处理**:

- **描述**: 增强前端对异常数据的容错能力。
- **详细规则**:
    - **空数据状态**: 当没有任何统计数据时，所有指标应归零，而不是显示计算错误 (NaN/Infinity)。
    - **非法日期**: 后端返回非法日期字符串时，前端应捕获异常并显示默认值 `Never`。

### 2. 验收标准

1.  打开 Admin Panel，所有 Source 的 "LAST CHECKED" 显示为有效日期格式或 "Never"。
2.  没有任何 Source 显示为 "Unknown"（除非数据库中确实没名字）。
3.  无数据的 Source，错误率和成功率显示为 "0%"，日均文章数显示为 "0"。

---

## 需求2：Admin Panel 抓取时间列增强 (已完成)

**需求编号**: 20260214005

**DD编号**: DD-WEB-Admin页面需求

### 1. 需求功能点

**1）新增抓取时间列**:

- **描述**: 在 "Source Analytics" 表格中新增 "Last Fetch" 和 "Next Fetch" 两列，提供更精确的运维视角。
- **UI/UX 交互**: 表格列宽需自适应调整。
- **详细规则**:
    1.  **Last Fetch (上次抓取)**:
        - 显示最后一次实际执行抓取的时间。
        - 格式：`YYYY-MM-DD HH:mm:ss`。
        - 若无记录，显示 `Never`。
    2.  **Next Fetch (下次抓取)**:
        - 显示下一次计划抓取的时间。
        - 计算逻辑：`Last Fetch + Frequency`。
        - 格式：`YYYY-MM-DD HH:mm:ss`。
    3.  **Last Checked (现有列)**:
        - *决策*: 将现有的 "LAST CHECKED" 列重命名为 "Last Fetch"，并新增 "Next Fetch" 列。

**2）后端数据支持**:

- **描述**: API 需返回下一次抓取的计算结果。
- **详细规则**:
    - 接口 `GET /api/admin/sources` 需在返回对象中增加 `nextFetchAt` 字段。
    - 计算公式：`nextFetchAt = lastChecked + scrapeFrequencyMinutes * 60 * 1000`。

### 2. 验收标准

1.  Admin Panel 表格中包含 "Last Fetch" 和 "Next Fetch" 列。
2.  "Next Fetch" 显示的时间应晚于当前时间（除非已过期未执行）。
3.  时间格式清晰易读。

---

## 需求3：Admin Panel 数据源调度初始化 (待实现)

**需求编号**: 20260214006

**DD编号**: DD-WEB-Admin页面需求

### 1. 需求功能点

**1）初始化调度器按钮**:

- **描述**: 在 Admin 面板提供一个手动触发所有数据源调度器初始化的入口。
- **UI/UX 交互**:
    - 在 Source Analytics 表格上方（如 Action Bar）新增一个 Primary Button，文案为 "Initialize Schedulers"。
    - 点击按钮后，显示 Loading 状态。
    - 操作成功后显示 Toast 提示 "Schedulers initialized successfully"。
    - 操作失败显示错误提示。
- **详细规则**:
    - 点击按钮调用后端 `/api/admin/sources/initialize` 接口。
    - 该接口会遍历所有活跃数据源，并对其对应的 Durable Object 发送 `initialize` 信号（或确保 Alarm 被设置）。

**2）后端初始化接口**:

- **描述**: 提供 API 用于批量唤醒数据源的 Durable Objects。
- **详细规则**:
    - 路径: `POST /api/admin/sources/initialize` (前端代理) -> `POST /admin/initialize-dos` (后端)。
    - 逻辑:
        1. 查询所有 `active` 状态的 Source。
        2. 为每个 Source 获取其 `DataSourceIngestorDO` Stub。
        3. 调用 DO 的 `initialize` 方法（需确保 DO 有此方法且能重置 Alarm）。
        4. 返回成功初始化的数量。

### 2. 验收标准

1.  Admin 页面可见 "Initialize Schedulers" 按钮。
2.  点击按钮后，网络请求成功 (200 OK)。
3.  后端日志显示 "Initializing DO for source: [ID]"。
4.  操作完成后，之前 "Next Fetch" 过期但不执行的源，应在短时间内（如 1 分钟内）开始执行抓取。
