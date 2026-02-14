
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure directories exist
const configDir = path.join(process.cwd(), '.config');
const wranglerHome = path.join(process.cwd(), '.wrangler_home');
const logsDir = path.join(process.cwd(), 'logs');

// Regex to match ANSI escape codes (Robust version from strip-ansi)
const ansiRegex = /[\u001b\u009b][[()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g;

function stripAnsi(str) {
  return str.replace(ansiRegex, '');
}

[configDir, wranglerHome, logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function archiveOldLogs() {
  const historyDir = path.join(logsDir, 'history');
  
  // logsDir is guaranteed to exist by the loop above

  try {
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    const files = fs.readdirSync(logsDir);
    let count = 0;
    
    files.forEach(file => {
      // Only move .log files, ignore directories (like 'history')
      if (file.endsWith('.log')) {
        const oldPath = path.join(logsDir, file);
        try {
          // Check if it's a file to be safe
          if (fs.statSync(oldPath).isFile()) {
            const newPath = path.join(historyDir, file);
            fs.renameSync(oldPath, newPath);
            count++;
          }
        } catch (e) {
          // Ignore errors for individual files (e.g. permission issues)
        }
      }
    });
    
    if (count > 0) {
      console.log(`[系统] 已归档 ${count} 个旧日志文件到 ${historyDir}`);
    }
  } catch (err) {
    console.error('[系统] 归档日志失败:', err);
  }
}

// Archive old logs before starting new sessions
archiveOldLogs();

function run(cmd, args, cwd, name, baseLogName, env = process.env) {
  console.log(`正在启动 ${name}...`);
  
  // Log Rotation: Add timestamp to filename
  const now = new Date();
  const timestamp = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + '-' +
    String(now.getHours()).padStart(2, '0') + '-' +
    String(now.getMinutes()).padStart(2, '0') + '-' +
    String(now.getSeconds()).padStart(2, '0');
    
  const logFile = `${baseLogName}-${timestamp}.log`;
  console.log(`[${name}] 日志写入到 ${logFile}`);
  
  const logStream = fs.createWriteStream(path.join(logsDir, logFile), { flags: 'a' });
  
  // Inject System Header in Chinese
  logStream.write(`[系统] 正在启动服务: ${name}\n`);
  logStream.write(`[系统] 启动时间: ${now.toLocaleString('zh-CN')}\n`);
  logStream.write(`[系统] 日志文件: ${logFile}\n`);
  logStream.write('-'.repeat(50) + '\n');
  
  const p = spawn(cmd, args, { cwd, shell: true, stdio: 'pipe', env });
  
  // Helper to handle stream data with buffering and timestamping
  const createLogHandler = (streamName, isError = false) => {
    let buffer = '';
    return (data) => {
      const chunk = data.toString();
      
      // Output to terminal (keep original behavior for now, or improved?)
      // Original: process.stdout.write(`[${name}] ${data}`);
      // Let's keep it simple for terminal to avoid double buffering issues there
      if (isError) {
        process.stderr.write(`[${name}] ${chunk}`);
      } else {
        process.stdout.write(`[${name}] ${chunk}`);
      }

      // Process for log file
      // 1. Strip ANSI codes
      const cleanChunk = stripAnsi(chunk);
      buffer += cleanChunk;

      // 2. Process complete lines
      let lineEndIndex;
      while ((lineEndIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.substring(0, lineEndIndex);
        buffer = buffer.substring(lineEndIndex + 1);
        
        // Try to parse JSON log (for ML Service)
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
            // Not valid JSON, ignore and print raw line
          }
        }

        // 3. Add Timestamp
        const now = new Date();
        const timeStr = now.getFullYear() + '-' +
          String(now.getMonth() + 1).padStart(2, '0') + '-' +
          String(now.getDate()).padStart(2, '0') + ' ' +
          String(now.getHours()).padStart(2, '0') + ':' +
          String(now.getMinutes()).padStart(2, '0') + ':' +
          String(now.getSeconds()).padStart(2, '0');
        
        // Only write if line is not empty (or just write it?)
        // Writing empty lines with timestamps might be noisy, but accurate.
        // Let's write it.
        logStream.write(`[${timeStr}] ${line}\n`);
      }
    };
  };

  p.stdout.on('data', createLogHandler('STDOUT'));
  p.stderr.on('data', createLogHandler('STDERR', true));
  
  p.on('error', (err) => {
    console.error(`${name} 错误:`, err);
    logStream.write(`[系统] 错误: ${err}\n`);
  });
  
  p.on('close', code => {
    console.log(`${name} 退出，代码 ${code}`);
    logStream.write(`[系统] 服务已停止，退出代码 ${code}\n`);
    logStream.end();
  });
  
  return p;
}

// Backend & Frontend separately to better see errors
// Override XDG_CONFIG_HOME and WRANGLER_HOME to avoid permission issues
const env = {
  ...process.env,
  XDG_CONFIG_HOME: configDir,
  WRANGLER_HOME: wranglerHome
};

// Build Logger first
console.log('正在构建 @meridian/logger...');
const buildLogger = spawn('pnpm', ['--filter', '@meridian/logger', 'build'], { cwd: process.cwd(), shell: true, stdio: 'inherit', env });
buildLogger.on('close', (code) => {
  if (code !== 0) {
    console.error('Logger 构建失败！');
    process.exit(1);
  }
  
  // Start Backend
  run('pnpm', ['--filter', '@meridian/backend', 'dev'], process.cwd(), 'Backend (Wrangler)', 'backend', env);

  // Start Frontend
  run('pnpm', ['--filter', '@meridian/frontend', 'dev'], process.cwd(), 'Frontend (Nuxt)', 'frontend', env);
  
  // ML Service
  run('uv', ['run', 'fastapi', 'dev', 'src/meridian_ml_service/main.py'], 
      path.join(process.cwd(), 'services/meridian-ml-service'), 
      'ML Service',
      'ml_service',
      { ...env, PYTHONUTF8: '1', PYTHONUNBUFFERED: '1' });
});

console.log('所有服务已启动。日志位于 ./logs 目录。按 Ctrl+C 停止。');
