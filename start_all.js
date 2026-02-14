
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

function run(cmd, args, cwd, name, logFile, env = process.env) {
  console.log(`Starting ${name}...`);
  const logStream = fs.createWriteStream(path.join(logsDir, logFile), { flags: 'a' });
  
  const p = spawn(cmd, args, { cwd, shell: true, stdio: 'pipe', env });
  
  p.stdout.on('data', (data) => {
    process.stdout.write(`[${name}] ${data}`);
    logStream.write(stripAnsi(data.toString()));
  });
  
  p.stderr.on('data', (data) => {
    process.stderr.write(`[${name}] ${data}`);
    logStream.write(stripAnsi(data.toString()));
  });
  
  p.on('error', (err) => {
    console.error(`${name} Error:`, err);
    logStream.write(`ERROR: ${err}\n`);
  });
  
  p.on('close', code => {
    console.log(`${name} exited with ${code}`);
    logStream.write(`Exited with code ${code}\n`);
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
console.log('Building @meridian/logger...');
const buildLogger = spawn('pnpm', ['--filter', '@meridian/logger', 'build'], { cwd: process.cwd(), shell: true, stdio: 'inherit', env });
buildLogger.on('close', (code) => {
  if (code !== 0) {
    console.error('Logger build failed!');
    process.exit(1);
  }
  
  // Start Backend
  run('pnpm', ['--filter', '@meridian/backend', 'dev'], process.cwd(), 'Backend (Wrangler)', 'backend.log', env);

  // Start Frontend
  run('pnpm', ['--filter', '@meridian/frontend', 'dev'], process.cwd(), 'Frontend (Nuxt)', 'frontend.log', env);
  
  // ML Service
  run('uv', ['run', 'fastapi', 'dev', 'src/meridian_ml_service/main.py'], 
      path.join(process.cwd(), 'services/meridian-ml-service'), 
      'ML Service',
      'ml_service.log',
      { ...env, PYTHONUTF8: '1' });
});

console.log('Services started. Logs available in ./logs directory. Press Ctrl+C to stop.');
