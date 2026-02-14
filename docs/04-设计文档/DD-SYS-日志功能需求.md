
---

## PRD-需求6：日志 JSON 解析与格式化 (待实现)

#### 需求编号：20260214010

### 概述

针对 `ML Service` 输出的 JSON 格式日志，在 `start_all.js` 中进行拦截和解析，将其转换为与其他服务一致的纯文本格式。

### 功能设计

#### 1. JSON 识别与转换

在 `createLogHandler` 处理完行分割后，尝试对每一行 (`line`) 进行 JSON 解析。

- **逻辑**:
    1.  检查 `line` 是否以 `{` 开头并以 `}` 结尾（快速过滤）。
    2.  尝试 `JSON.parse(line)`。
    3.  若成功，提取关键字段：
        - `level`: 日志级别 (如 `INFO`, `ERROR`)。
        - `message`: 日志内容。
        - `module` / `logger`: 模块名称（可选，作为前缀）。
    4.  若包含 `level` 和 `message`，则重构 `line` 为 `[LEVEL] [Module] Message`。
    5.  若解析失败或缺少关键字段，保持原样。

#### 2. 格式示例

- **输入**: `{"timestamp": "...", "level": "info", "message": "Changes detected", "module": "main"}`
- **转换后**: `[INFO] [main] Changes detected`
- **最终写入文件**: `[2026-02-14 13:04:20] [INFO] [main] Changes detected` (时间戳由外层逻辑添加)

### 详细设计

#### 代码变更 (`start_all.js`)

```javascript
// Inside createLogHandler loop
while ((lineEndIndex = buffer.indexOf('\n')) !== -1) {
  let line = buffer.substring(0, lineEndIndex);
  buffer = buffer.substring(lineEndIndex + 1);
  
  // JSON Parsing Logic
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
    try {
      const logObj = JSON.parse(trimmedLine);
      if (logObj.level && logObj.message) {
        const level = logObj.level.toUpperCase();
        const module = logObj.module || logObj.logger || '';
        const moduleStr = module ? ` [${module}]` : '';
        line = `[${level}]${moduleStr} ${logObj.message}`;
      }
    } catch (e) {
      // Not valid JSON, ignore
    }
  }

  const timeStr = ...;
  logStream.write(`[${timeStr}] ${line}\n`);
}
```

### 变更清单

| 文件路径 | 变更类型 | 说明 |
| :--- | :--- | :--- |
| `start_all.js` | 修改 | 在写入文件前增加 JSON 解析逻辑。 |

### 测试与验证要点

1.  **启动测试**: 运行 `start_all.js` 启动 ML Service。
2.  **日志检查**: 查看 `logs/ml_service-*.log`。
3.  **格式验证**: 确认不再看到 JSON 字符串，而是 `[INFO] ...` 格式。
