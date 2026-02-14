---
doc_type: prd
doc_id: PRD-WEB-Admin页面需求
owner: frontend
related_requirement:
  - 20260214001
  - 20260214005
  - 20260214006
  - 20260214011
  - 20260214012
created: 2026-02-14
updated: 2026-02-14
---
# 产品需求文档（PRD）：Admin Panel 数据显示修复与增强

**需求来源**：docs/01-我的需求/我的需求.md

本文档针对的功能模块：Frontend (Admin Panel) & Backend (API)

---

## 1. 引言

### 1.1 背景
Admin Panel 是管理员监控 RSS 源抓取状态的核心界面。近期发现存在数据显示异常（NaN/N/A）、关键运维字段缺失（Last/Next Fetch）以及调度器未初始化导致抓取停滞的问题。此外，为了方便管理员在非定时任务时间点生成情报简报，需要增加手动触发功能。最后，为了提升中文用户体验，需要将界面全面汉化。

### 1.2 目标
修复显示错误，增强调度可观测性，提供手动修复与触发工具，并完成界面汉化，确保系统稳定运行且易于管理。

---

## 2. 变更记录

- **2026-02-14**:
    - **需求编号**: 20260214012
    - **内容**: Admin 页面全面汉化。
    - **目标**: 提升中文用户体验。
- **2026-02-14**:
    - **需求编号**: 20260214011
    - **内容**: 新增 "生成情报简报" 按钮。
    - **目标**: 允许管理员手动触发情报汇总。
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

## 需求5：Admin Panel 抓取时间列增强 (已完成)

**需求编号**: 20260214005

**DD编号**: DD-WEB-Admin页面需求

### 1. 需求功能点

- **描述**: 在 "Source Analytics" 表格中新增两列，显示调度时间信息。
- **字段定义**:
    - **LAST FETCH**: 上次实际执行抓取的时间。
    - **NEXT FETCH**: 下次计划执行抓取的时间。

### 2. 验收标准

1.  表格正确显示 Last Fetch 和 Next Fetch 时间。

---

## 需求6：初始化调度器功能 (已完成)

**需求编号**: 20260214006

**DD编号**: DD-WEB-Admin页面需求

### 1. 需求功能点

- **描述**: 新增一个 "Initialize Schedulers" 按钮。
- **逻辑**: 点击后调用后端接口，唤醒所有 Source DO，确保调度器处于激活状态。

### 2. 验收标准

1.  点击按钮提示初始化成功。
2.  抓取任务恢复正常执行。

---

## 需求11：Admin 手动触发情报汇总 (已完成)

**需求编号**: 20260214011

**DD编号**: DD-WEB-Admin页面需求

### 1. 需求功能点

- **描述**: 新增 "Generate Briefing" 按钮。
- **逻辑**: 点击后调用后端接口，强制触发一次情报汇总工作流。

### 2. 验收标准

1.  点击按钮后，后台日志显示 `GenerateBriefWorkflow` 启动。

---

## 需求12：Admin 页面汉化 (待实现)

**需求编号**: 20260214012

**DD编号**: DD-WEB-Admin页面需求

### 1. 需求功能点

- **描述**: 将 Admin 页面所有静态文本替换为中文。
- **对照表**:
    - Admin Panel -> 管理后台
    - Generate Briefing -> 生成情报简报
    - Initialize Schedulers -> 初始化调度器
    - Add Source -> 添加数据源
    - Reprocess Articles -> 重处理文章
    - System Overview -> 系统概览
    - Last Activity -> 最近活动
    - Today's Stats -> 今日统计
    - Source Health -> 数据源健康度
    - Source Check -> 检查源
    - Article Processed -> 处理文章
    - Article Fetched -> 抓取文章
    - Articles Fetched -> 已抓取文章
    - Articles Processed -> 已处理文章
    - Errors -> 错误数
    - Total Sources -> 总数据源
    - Stale Sources -> 停滞数据源
    - Avg Process Success -> 平均处理成功率
    - Avg Error Rate -> 平均错误率
    - Avg Articles/Day -> 日均文章数
    - Frequency -> 抓取频率
    - Paywall only -> 仅付费墙
    - All -> 全部
    - Hourly -> 每小时
    - 4 Hours -> 4小时
    - 6 Hours -> 6小时
    - Daily -> 每天
    - SOURCE -> 数据源
    - FREQUENCY -> 频率
    - LAST CHECKED -> 上次检查
    - LAST FETCH -> 上次抓取
    - NEXT FETCH -> 下次抓取
    - ERROR RATE -> 错误率
    - SUCCESS RATE -> 成功率
    - AVG/DAY -> 日均量
    - TOTAL -> 总数
    - PAYWALL -> 付费墙
    - ACTIONS -> 操作
    - Edit -> 编辑
    - Delete -> 删除

### 2. 验收标准

1.  页面上不再出现英文标签。
2.  所有功能正常可用。
