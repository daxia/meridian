# EXP-SYS-日志文件ANSI乱码修复

## 1. 问题描述

在 Meridian 项目的本地开发环境中，通过 `node start_all.js` 启动所有服务后，`logs/` 目录下生成的日志文件（如 `frontend.log`, `backend.log`）包含大量 ANSI 颜色转义序列（例如 `[32m`, `[39m`）。

**现象**：
- 在 VS Code 或记事本中打开日志文件时，充斥着乱码字符。
- 难以进行关键字搜索和故障排查。
- 只有在终端（Terminal）中直接查看输出时才是正常的彩色显示。

## 2. 根因分析

### 2.1 原始实现机制
`start_all.js` 使用 Node.js 的 `child_process.spawn` 启动子进程，并通过监听 `stdout` 和 `stderr` 数据流来分发日志：

```javascript
p.stdout.on('data', (data) => {
  // 1. 直接写入父进程终端（保留颜色）
  process.stdout.write(`[${name}] ${data}`);
  // 2. 直接写入文件流（同时也写入了颜色代码）
  logStream.write(data); 
});
```

现代 CLI 工具（如 Vite, Wrangler, Nuxt）通常会检测 TTY 环境。即使在管道中，如果配置了 `FORCE_COLOR` 或工具默认开启颜色，输出就会包含 ANSI 码。

### 2.2 为什么需要剥离
- **终端体验**：开发者希望在控制台看到彩色高亮，区分 Error/Warn/Info。
- **文件归档**：日志文件主要用于文本分析和持久化存储，纯文本格式兼容性最好。
- **冲突**：单一数据源（`data` 事件）同时满足了这两个互斥的需求，导致文件端被“污染”。

## 3. 解决方案

在写入文件流之前，引入中间处理层，使用正则表达式剥离 ANSI 代码。

### 3.1 引入正则剥离
在 `start_all.js` 中添加 `stripAnsi` 函数：

```javascript
// 匹配 ANSI 转义序列的正则（参考 strip-ansi 库）
const ansiRegex = /[\u001b\u009b][[()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g;

function stripAnsi(str) {
  return str.replace(ansiRegex, '');
}
```

### 3.2 分流处理
修改数据流处理逻辑，将“原始数据”给终端，“清洗后数据”给文件：

```javascript
p.stdout.on('data', (data) => {
  const str = data.toString();
  // 终端：保留原样（带颜色）
  process.stdout.write(`[${name}] ${str}`);
  // 文件：剥离颜色
  logStream.write(stripAnsi(str));
});
```

## 4. 经验教训

1.  **数据流分离原则**：当同一个数据源需要被不同消费者（Human vs Machine/File）使用时，必须在分发层进行格式适配。
2.  **正则健壮性**：简单的 ANSI 匹配正则（如 `/\x1B\[\d+m/`）往往无法覆盖所有情况（如光标移动、清屏指令）。在处理底层系统输出时，应使用经过社区验证的成熟正则模式。
3.  **工具链标准化**：在 Monorepo 开发脚本中，应当预见并统一处理子进程的输出格式，而不是依赖各子工具（Vite/Wrangler）的配置。
