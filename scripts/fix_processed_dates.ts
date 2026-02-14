import 'dotenv/config';
import { sql } from 'drizzle-orm';
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

async function main() {
    await loadEnv();
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL is not set.');
        process.exit(1);
    }

    const client = postgres(dbUrl);
    const db = drizzle(client, { schema });

    console.log('🛠️ Fixing NULL processed_at dates...');

    // Update all PROCESSED items with NULL processed_at to NOW()
    // Or preferably to ingested_at if available, otherwise NOW()
    const result = await db.execute(sql`
        UPDATE ${schema.$ingested_items}
        SET processed_at = COALESCE(ingested_at, NOW())
        WHERE status = 'PROCESSED' AND processed_at IS NULL
    `);

    console.log(`✅ Updated ${result.count} items.`);

    await client.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
