import 'dotenv/config';
import { desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../packages/database/src/schema';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load .env
async function loadEnv() {
    const dbEnvPath = path.resolve(__dirname, '../packages/database/.env');
    if (fs.existsSync(dbEnvPath)) {
        try {
            const dotenv = await import('dotenv');
            dotenv.config({ path: dbEnvPath });
        } catch (e) {
            console.warn('Could not load dotenv');
        }
    }
}

async function getApiToken() {
    const devVarsPath = path.resolve(__dirname, '../apps/backend/.dev.vars');
    if (fs.existsSync(devVarsPath)) {
        const content = fs.readFileSync(devVarsPath, 'utf-8');
        const match = content.match(/API_TOKEN="?([^"\n]+)"?/);
        if (match && match[1]) return match[1];
    }
    return 'hunter2'; // Fallback
}

async function main() {
    await loadEnv();
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL is not set.');
        process.exit(1);
    }

    const client = postgres(dbUrl);
    const db = drizzle(client, { schema });

    console.log('🔍 Checking latest processed articles...');
    
    // Find the latest processed article time
    // Note: 'PROCESSED' is a valid enum value
    const result = await db.select({
        max: sql<string>`max(${schema.$ingested_items.processed_at})`
    })
    .from(schema.$ingested_items)
    .where(eq(schema.$ingested_items.status, 'PROCESSED'));

    let hoursLookback = 24; // Default
    if (result[0] && result[0].max) {
        const lastProcessed = new Date(result[0].max);
        const now = new Date();
        const diffHours = (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60);
        console.log(`📅 Latest article processed at: ${lastProcessed.toISOString()} (${diffHours.toFixed(1)} hours ago)`);
        
        // If latest article is older than 24h, we need to increase lookback
        // We'll set lookback to cover the gap + 24h buffer, max 168h (1 week)
        hoursLookback = Math.ceil(diffHours + 24);
        if (hoursLookback > 168) hoursLookback = 168; 
    } else {
        console.log('⚠️ No PROCESSED articles found (or query failed). Using default 24h lookback.');
    }

    console.log(`🚀 Triggering Brief Generation with hoursLookback=${hoursLookback}...`);

    const token = await getApiToken();
    const backendUrl = 'http://localhost:8787'; 
    const url = `${backendUrl}/admin/briefs/trigger`; // Corrected path

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ hoursLookback })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }

        const json = await response.json();
        console.log('✅ Brief Generation Triggered Successfully!');
        console.log('Response:', json);
        console.log('\n⏳ Please wait a few moments for the workflow to complete, then run check_db_status.ts again.');

    } catch (error) {
        console.error('❌ Failed to trigger brief generation:', error);
        console.log('Is the backend server running? (pnpm --filter @meridian/backend run dev)');
    }

    await client.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
