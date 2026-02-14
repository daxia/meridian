
const fs = require('fs');
const path = require('path');

const dirs = [
  'packages/logger/src'
];

dirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created ${fullPath}`);
  }
});
