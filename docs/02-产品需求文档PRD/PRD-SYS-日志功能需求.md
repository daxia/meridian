
---

## 需求6：日志 JSON 解析与格式化 (待实现)

**需求编号**: 20260214010

**DD编号**: DD-SYS-日志功能需求

### 1. 需求功能点

**1）智能解析 JSON 日志**:

- **描述**: `ML Service` 输出的日志部分为 JSON 格式，需在写入日志文件前解析并转换为易读文本。
- **输入示例**: `{"timestamp": "...", "level": "info", "message": "Changes detected", "module": "main"}`
- **输出示例**: `[INFO] [main] Changes detected` (前缀由需求5添加的时间戳)
- **验收标准**:
    - `logs/ml_service-*.log` 中不应包含原始 JSON 字符串。
    - 所有日志行格式统一为 `[时间戳] [LEVEL] 内容`。

### 2.目标与约束

- **目标**: 统一日志格式，提升可读性。
- **约束**: 仅在 `start_all.js` 中处理，不修改 Python 代码（除非必要）。解析失败时应保留原始文本。

### 3. 当前实现分析

- **现状**: Python 的 `logger.py` 配置了 `JsonFormatter`。
- **方案**: 在 `start_all.js` 的 `createLogHandler` 中增加 JSON 解析逻辑。

### 4. 需求审核结论

**审核结果**: 批准

**审核日期**: 2026-02-14

**结论**: 同意实施。
