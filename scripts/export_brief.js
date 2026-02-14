/**
 * Meridian Intelligence Brief Exporter
 *
 * Usage: node scripts/export_brief.js [output_dir]
 * Default output_dir: ./report
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8787';
const DEV_VARS_PATH = path.join(__dirname, '../apps/backend/.dev.vars');

async function getApiToken() {
  if (process.env.API_TOKEN) {
    return process.env.API_TOKEN;
  }

  try {
    if (fs.existsSync(DEV_VARS_PATH)) {
      const content = fs.readFileSync(DEV_VARS_PATH, 'utf-8');
      const match = content.match(/API_TOKEN="?([^"\n]+)"?/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (err) {
    console.warn('Warning: Failed to read .dev.vars:', err.message);
  }

  return 'hunter2'; // Default fallback for dev
}

async function fetchLatestBrief(token) {
  const url = `${BACKEND_URL}/reports/last-report`;
  console.log(`Fetching latest brief from ${url}...`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No reports found in the database.');
      }
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.cause && error.cause.code === 'ECONNREFUSED') {
      throw new Error(`Connection refused to ${BACKEND_URL}. Is the backend server running?`);
    }
    throw error;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function main() {
  const outputDir = process.argv[2] || path.join(__dirname, '../report');

  try {
    // 1. Prepare environment
    if (!fs.existsSync(outputDir)) {
      console.log(`Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const token = await getApiToken();

    // 2. Fetch data
    const report = await fetchLatestBrief(token);
    
    // 3. Process content
    // The report object structure depends on the API response.
    // Based on schema, it has: { content, createdAt, ... }
    const briefContent = report.content;
    const briefDate = formatDate(report.createdAt);
    
    const filename = `情报简报-${briefDate}.md`;
    const filePath = path.join(outputDir, filename);

    // 4. Write file
    fs.writeFileSync(filePath, briefContent, 'utf-8');
    console.log(`✅ Successfully exported brief to: ${filePath}`);

  } catch (error) {
    console.error('❌ Export failed:', error.message);
    process.exit(1);
  }
}

main();
