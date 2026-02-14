import { zValidator } from '@hono/zod-validator';
import { $data_sources, $ingested_items, eq, isNull } from '@meridian/database';
import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../app';
import { Logger } from '@meridian/logger';
import { tryCatchAsync } from '../lib/tryCatchAsync';
import { getDb, hasValidAuthToken } from '../lib/utils';

const logger = new Logger({ router: 'durable-objects' });

const route = new Hono<HonoEnv>()
  // handle DO-specific routes
  .get(
    '/source/:sourceId/*',
    zValidator(
      'param',
      z.object({
        sourceId: z.string().min(1, 'Source ID is required'),
      })
    ),
    async c => {
      const { sourceId } = c.req.valid('param');
      const doId = c.env.DATA_SOURCE_INGESTOR.idFromName(decodeURIComponent(sourceId));
      const stub = c.env.DATA_SOURCE_INGESTOR.get(doId);

      // reconstruct path for the DO
      const url = new URL(c.req.url);
      const pathParts = url.pathname.split('/');
      const doPath = `/${pathParts.slice(4).join('/')}`;
      const doUrl = new URL(doPath + url.search, 'http://do');

      const doRequest = new Request(doUrl.toString(), c.req.raw);
      return stub.fetch(doRequest);
    }
  )
  // admin endpoints
  .post(
    '/admin/source/:sourceId/init',
    zValidator(
      'param',
      z.object({
        sourceId: z.string().min(1, 'Source ID is required'),
      })
    ),
    async c => {
      // auth check
      if (!hasValidAuthToken(c)) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const initLogger = logger.child({ operation: 'init-source' });
      const { sourceId } = c.req.valid('param');

      const db = getDb(c.env.HYPERDRIVE);

      // Get the source first
      const sourceResult = await tryCatchAsync(
        db.query.$data_sources.findFirst({
          where: eq($data_sources.id, Number(sourceId)),
        })
      );

      if (sourceResult.isErr()) {
        const error = sourceResult.error instanceof Error ? sourceResult.error : new Error(String(sourceResult.error));
        initLogger.error('获取数据源失败', error, { sourceId });
        return c.json({ error: 'Failed to fetch source' }, 500);
      }

      const source = sourceResult.value;
      if (!source) {
        return c.json({ error: 'Source not found' }, 404);
      }

      // Initialize the DO
      const doId = c.env.DATA_SOURCE_INGESTOR.idFromName(source.config.config.url);
      const stub = c.env.DATA_SOURCE_INGESTOR.get(doId);

      const initResult = await tryCatchAsync(
        stub.initialize({
          id: source.id,
          source_type: source.source_type,
          config: source.config,
          config_version_hash: source.config_version_hash,
          scrape_frequency_tier: source.scrape_frequency_minutes,
        })
      );
      if (initResult.isErr()) {
        const error = initResult.error instanceof Error ? initResult.error : new Error(String(initResult.error));
        initLogger.error('初始化数据源 DO 失败', error, { sourceId, url: source.config.config.url });
        return c.json({ error: 'Failed to initialize source DO' }, 500);
      }

      initLogger.info('成功初始化数据源 DO', { sourceId, url: source.config.config.url });
      return c.json({ success: true });
    }
  )
  .post(
    '/admin/source/:sourceId/trigger',
    zValidator(
      'param',
      z.object({
        sourceId: z.string().min(1, 'Source ID is required'),
      })
    ),
    async c => {
      // auth check
      if (!hasValidAuthToken(c)) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const triggerLogger = logger.child({ operation: 'trigger-source' });
      const { sourceId } = c.req.valid('param');

      const db = getDb(c.env.HYPERDRIVE);

      // Get the source first to get the URL for the DO ID
      const sourceResult = await tryCatchAsync(
        db.query.$data_sources.findFirst({
          where: eq($data_sources.id, Number(sourceId)),
        })
      );

      if (sourceResult.isErr()) {
        const error = sourceResult.error instanceof Error ? sourceResult.error : new Error(String(sourceResult.error));
        triggerLogger.error('获取数据源失败', error, { sourceId });
        return c.json({ error: 'Failed to fetch source' }, 500);
      }

      const source = sourceResult.value;
      if (!source) {
        return c.json({ error: 'Source not found' }, 404);
      }

      // Get the DO
      const doId = c.env.DATA_SOURCE_INGESTOR.idFromName(source.config.config.url);
      const stub = c.env.DATA_SOURCE_INGESTOR.get(doId);

      // Trigger the fetch
      const triggerResult = await tryCatchAsync(
        stub.fetch('http://do/trigger', { method: 'POST' })
      );

      if (triggerResult.isErr()) {
        const error = triggerResult.error instanceof Error ? triggerResult.error : new Error(String(triggerResult.error));
        triggerLogger.error('触发数据源 DO 失败', error, { sourceId, url: source.config.config.url });
        return c.json({ error: 'Failed to trigger source DO' }, 500);
      }

      triggerLogger.info('成功触发数据源 DO', { sourceId, url: source.config.config.url });
      return c.json({ success: true });
    }
  )
  .post('/admin/initialize-dos', async c => {
    // auth check
    if (!hasValidAuthToken(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const initLogger = logger.child({ operation: 'initialize-dos' });
    initLogger.info('正在从数据库初始化 SourceScraperDOs');

    const db = getDb(c.env.HYPERDRIVE);

    // Get batch size from query params, default to 100
    const batchSize = Number(c.req.query('batchSize')) || 100;
    initLogger.info('使用批处理大小', { batchSize });

    const allSourcesResult = await tryCatchAsync(
      db
        .select({
          id: $data_sources.id,
          source_type: $data_sources.source_type,
          config: $data_sources.config,
          config_version_hash: $data_sources.config_version_hash,
          scrape_frequency_tier: $data_sources.scrape_frequency_minutes,
        })
        .from($data_sources)
    );
    if (allSourcesResult.isErr()) {
      const error =
        allSourcesResult.error instanceof Error ? allSourcesResult.error : new Error(String(allSourcesResult.error));
      console.error('Failed to fetch sources from database:', error);
      initLogger.error('从数据库获取数据源失败', error);
      return c.json({ error: 'Failed to fetch sources from database', details: error.message }, 500);
    }

    const allSources = allSourcesResult.value;
    initLogger.info('已从数据库获取数据源', { source_count: allSources.length });

    // Process sources in batches
    let processedCount = 0;
    let successCount = 0;

    // Create batches of sources
    const batches = [];
    for (let i = 0; i < allSources.length; i += batchSize) {
      batches.push(allSources.slice(i, i + batchSize));
    }

    // Process each batch sequentially
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      initLogger.info('正在处理批次', { batchIndex: batchIndex + 1, batchSize: batch.length });

      const batchResults = await Promise.all(
        batch.map(async source => {
          const sourceLogger = initLogger.child({ source_id: source.id, url: source.config.config.url });
          const doId = c.env.DATA_SOURCE_INGESTOR.idFromName(source.config.config.url);
          const stub = c.env.DATA_SOURCE_INGESTOR.get(doId);

          sourceLogger.debug('正在初始化 DO');
          const result = await tryCatchAsync(stub.initialize(source));
          if (result.isErr()) {
            const error = result.error instanceof Error ? result.error : new Error(String(result.error));
            sourceLogger.error('初始化 DO 失败', error);
            return false;
          }

          sourceLogger.debug('DO 初始化成功');
          return true;
        })
      );

      processedCount += batch.length;
      successCount += batchResults.filter(success => success).length;

      initLogger.info('批次处理完成', {
        batchIndex: batchIndex + 1,
        batchSuccessful: batchResults.filter(success => success).length,
        totalProcessed: processedCount,
        totalSuccessful: successCount,
      });
    }

    initLogger.info('初始化流程完成', { total: allSources.length, successful: successCount });
    return c.json({ initialized: successCount, total: allSources.length });
  })
  .delete(
    '/admin/source/:sourceId',
    zValidator(
      'param',
      z.object({
        sourceId: z.string().min(1, 'Source ID is required'),
      })
    ),
    async c => {
      // auth check
      if (!hasValidAuthToken(c)) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const deleteLogger = logger.child({ operation: 'delete-source' });
      const { sourceId } = c.req.valid('param');

      const db = getDb(c.env.HYPERDRIVE);

      // Get the source first to get its URL
      const sourceResult = await tryCatchAsync(
        db.query.$data_sources.findFirst({
          where: eq($data_sources.id, Number(sourceId)),
        })
      );

      if (sourceResult.isErr()) {
        const error = sourceResult.error instanceof Error ? sourceResult.error : new Error(String(sourceResult.error));
        deleteLogger.error('获取数据源失败', error, { sourceId });
        return c.json({ error: 'Failed to fetch source' }, 500);
      }

      const source = sourceResult.value;
      if (!source) {
        return c.json({ error: 'Source not found' }, 404);
      }

      // Delete the durable object first
      const doId = c.env.DATA_SOURCE_INGESTOR.idFromName(source.config.config.url);
      const stub = c.env.DATA_SOURCE_INGESTOR.get(doId);

      const deleteResult = await tryCatchAsync(
        stub.fetch('http://do/delete', {
          method: 'DELETE',
        })
      );
      if (deleteResult.isErr()) {
        const error = deleteResult.error instanceof Error ? deleteResult.error : new Error(String(deleteResult.error));
        deleteLogger.error('删除数据源 DO 失败', error, { sourceId, url: source.config.config.url });
        return c.json({ error: 'Failed to delete source DO' }, 500);
      }

      // Then delete from database
      // delete the articles first
      const articlesResult = await tryCatchAsync(
        db.delete($ingested_items).where(eq($ingested_items.data_source_id, Number(sourceId)))
      );
      if (articlesResult.isErr()) {
        const error =
          articlesResult.error instanceof Error ? articlesResult.error : new Error(String(articlesResult.error));
        deleteLogger.error('删除文章失败', error, { sourceId });
        return c.json({ error: 'Failed to delete articles' }, 500);
      }

      const dbDeleteResult = await tryCatchAsync(
        db.delete($data_sources).where(eq($data_sources.id, Number(sourceId)))
      );
      if (dbDeleteResult.isErr()) {
        const error =
          dbDeleteResult.error instanceof Error ? dbDeleteResult.error : new Error(String(dbDeleteResult.error));
        deleteLogger.error('从数据库删除数据源失败', error, { sourceId });
        return c.json({ error: 'Failed to delete source from database' }, 500);
      }

      deleteLogger.info('成功删除数据源', { sourceId, url: source.config.config.url });
      return c.json({ success: true });
    }
  );

export default route;
