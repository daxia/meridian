import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../app';
import { getDb, hasValidAuthToken } from '../lib/utils';
import { $ingested_items, desc, eq } from '@meridian/database';
import { startProcessArticleWorkflow } from '../workflows/processIngestedItem.workflow';

const route = new Hono<HonoEnv>()
  .post('/briefs/trigger', async c => {
    // auth check
    if (!hasValidAuthToken(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Trigger the workflow
    // We pass 'force: true' to indicate this is a manual trigger
    const instance = await c.env.GENERATE_BRIEF_WORKFLOW.create({
      params: {
        force: true,
      },
    });

    return c.json({
      success: true,
      instanceId: instance.id,
    });
  })
  .post('/articles/reprocess', async c => {
    if (!hasValidAuthToken(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const db = getDb(c.env.HYPERDRIVE);
    
    // Find all NEW articles
    const newArticles = await db
      .select({ id: $ingested_items.id })
      .from($ingested_items)
      .where(eq($ingested_items.status, 'NEW'))
      .limit(100); // Limit to 100 for safety

    if (newArticles.length === 0) {
      return c.json({ message: 'No NEW articles found to reprocess' });
    }

    const ids = newArticles.map(a => a.id);
    
    // Trigger workflow
    const result = await startProcessArticleWorkflow(c.env, { ingested_item_ids: ids });

    if (result.isErr()) {
       return c.json({ error: 'Failed to start workflow', details: result.error.message }, 500);
    }

    return c.json({ 
      success: true, 
      count: ids.length,
      workflowId: result.value.id 
    });
  })
  .get('/debug/articles', async c => {
    const db = getDb(c.env.HYPERDRIVE);
    // Simple query to avoid complex Drizzle issues in this environment
    const items = await db.select().from($ingested_items).limit(10);
    
    // Also get counts by status
    const allItems = await db.select({ status: $ingested_items.status }).from($ingested_items);
    const counts = allItems.reduce((acc: Record<string, number>, item) => {
      const status = item.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return c.json({
      counts,
      sample_items: items.map(i => ({
        id: i.id,
        status: i.status,
        processed_at: i.processed_at,
        has_embedding: !!i.embedding
      }))
    });
  });

export default route;
