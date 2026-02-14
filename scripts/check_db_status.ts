import 'dotenv/config';
import { desc, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../packages/database/src/schema';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    // Manually load .env from packages/database
    const dbEnvPath = path.resolve(__dirname, '../packages/database/.env');
    if (fs.existsSync(dbEnvPath)) {
        console.log(`Loading .env from ${dbEnvPath}`);
        try {
            const dotenv = await import('dotenv');
            dotenv.config({ path: dbEnvPath });
        } catch (e) {
            console.warn('Could not load dotenv, checking process.env...');
        }
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL is not set in environment variables.');
        process.exit(1);
    }

    console.log(`🔌 Connecting to database at ${dbUrl}...`);
    const client = postgres(dbUrl);
    const db = drizzle(client, { schema });

    console.log('\n--- 📊 Reports Check ---');
    try {
        const reports = await db.select()
            .from(schema.$reports)
            .orderBy(desc(schema.$reports.created_at))
            .limit(5);

        if (reports.length === 0) {
            console.log('⚠️ No reports found.');
        } else {
            console.log(`✅ Found ${reports.length} recent reports:`);
            reports.forEach(r => {
                console.log(`\n---------------------------------------------------`);
                console.log(`[${r.id}] ${r.created_at?.toISOString()} - "${r.title}"`);
                console.log(`    Stats: ${r.totalArticles || 0} articles, ${r.totalSources || 0} sources`);
                console.log(`    TLDR: ${r.tldr ? r.tldr.substring(0, 100) + '...' : 'N/A'}`);
                console.log(`    Content Preview (First 200 chars):`);
                console.log(`    ${r.content ? r.content.substring(0, 200).replace(/\n/g, '\n    ') : 'EMPTY CONTENT'}`);
                console.log(`---------------------------------------------------\n`);
            });
        }
    } catch (error) {
        console.error('❌ Error querying reports:', error);
    }

    console.log('\n--- 📥 Ingested Items Stats ---');
    try {
        const stats = await db.select({
            status: schema.$ingested_items.status,
            count: sql<number>`cast(count(*) as int)`
        })
        .from(schema.$ingested_items)
        .groupBy(schema.$ingested_items.status);

        if (stats.length === 0) {
            console.log('⚠️ No ingested items found.');
        } else {
            console.log('✅ Item counts by status:');
            stats.forEach(s => {
                console.log(`  ${s.status}: ${s.count}`);
            });
        }

        // Check date range of PROCESSED items using raw SQL to avoid enum issues
        const processedRange = await db.execute(sql`
            SELECT min(processed_at) as min, max(processed_at) as max, count(*) as total, count(processed_at) as non_null_count
            FROM ${schema.$ingested_items}
            WHERE status = 'PROCESSED'
        `);

        if (processedRange[0]) {
             console.log(`\n📊 PROCESSED items detailed stats:`);
             console.log(`   Total PROCESSED: ${processedRange[0].total}`);
             console.log(`   With valid processed_at: ${processedRange[0].non_null_count}`);
             
             if (processedRange[0].min) {
                 console.log(`   Range: ${processedRange[0].min} to ${processedRange[0].max}`);
             } else {
                 console.log(`   ⚠️ All processed items have NULL processed_at!`);
             }
        }

    } catch (error) {
        console.error('❌ Error querying item stats:', error);
    }

    await client.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
