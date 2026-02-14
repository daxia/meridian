import { zValidator } from '@hono/zod-validator';
import { $data_sources, eq } from '@meridian/database';
import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../app';
import { Logger } from '@meridian/logger';
import { tryCatchAsync } from '../lib/tryCatchAsync';
import { getDb, hasValidAuthToken } from '../lib/utils';

const logger = new Logger({ router: 'sources' });

const route = new Hono<HonoEnv>().delete(
  '/:id',
  zValidator(
    'param',
    z.object({
      id: z.coerce.number(),
    })
  ),
  async c => {
    if (!hasValidAuthToken(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const routeLogger = logger.child({
      operation: 'delete-source',
      source_id: c.req.valid('param').id,
    });
    routeLogger.info('尝试删除源');

    const db = getDb(c.env.HYPERDRIVE);

    const sourceResult = await tryCatchAsync(
      db.query.$data_sources.findFirst({
        where: eq($data_sources.id, c.req.valid('param').id),
      })
    );
    if (sourceResult.isErr()) {
      const error = sourceResult.error instanceof Error ? sourceResult.error : new Error(String(sourceResult.error));
      routeLogger.error('获取源失败', error);
      return c.json({ error: '获取源失败' }, 500);
    }

    const source = sourceResult.value;
    if (source === undefined) {
      routeLogger.warn('未找到源');
      return c.json({ error: "Source doesn't exist" }, 404);
    }

    routeLogger.debug('找到源，正在进行删除', { source_url: source.config.config.url });
    const doId = c.env.DATA_SOURCE_INGESTOR.idFromName(source.config.config.url); // Use URL for ID stability
    const stub = c.env.DATA_SOURCE_INGESTOR.get(doId);

    const deleteResult = await tryCatchAsync(
      Promise.all([db.delete($data_sources).where(eq($data_sources.id, c.req.valid('param').id)), stub.destroy()])
    );
    if (deleteResult.isErr()) {
      const error = deleteResult.error instanceof Error ? deleteResult.error : new Error(String(deleteResult.error));
      routeLogger.error('删除源失败', error);
      return c.json({ error: 'Failed to delete source' }, 500);
    }

    routeLogger.info('源删除成功');
    return c.json({ success: true });
  }
);

export default route;
