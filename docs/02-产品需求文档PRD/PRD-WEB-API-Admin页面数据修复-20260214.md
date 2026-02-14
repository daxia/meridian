---
doc_type: prd
doc_id: PRD-WEB-AdminPanelFixes-20260214
owner: frontend
related_requirement:
  - 20260214001
created: 2026-02-14
updated: 2026-02-14
---
# 产品需求文档（PRD）：Admin页面数据修复

**需求来源**：docs/01-我的需求/我的需求.md — 第 1 条「Admin Panel 数据显示修复 (2026-02-14)」

本文文档针对的功能模块：Frontend (Admin Panel)

---

## 1. 引言

### 1.1 背景
Admin Panel 是管理员监控 RSS 源抓取状态的核心界面。当前 "Source Analytics" 列表存在数据格式化错误（NaN, N/A）和源信息缺失（Unknown），严重影响了可读性和运维监控能力。

### 1.2 目标
修复 Admin Panel 中 "Source Analytics" 列表的数据显示问题，确保日期、百分比和源名称能正确渲染，提升运维体验。

---

## 2. 变更记录

- **2026-02-14**:
  - **需求编号**: 20260214001
  - **内容**: 修复日期 NaN、百分比 N/A 及 Source Unknown 问题。
  - **目标**: 恢复 Admin Panel 数据可读性。

---

## 需求1：Admin Panel 数据显示修复 (进行中)

**需求编号**: 20260214001

**DD编号**: DD-WEB-API-Admin页面数据修复-20260214

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
