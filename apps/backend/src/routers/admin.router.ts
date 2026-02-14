import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../app';
import { getDb, hasValidAuthToken } from '../lib/utils';
import { $ingested_items, desc, eq, inArray, isNotNull } from '@meridian/database';
import { startProcessArticleWorkflow } from '../workflows/processIngestedItem.workflow';
import { getSetting, setSetting, SETTINGS_KEYS } from '../lib/settings';
import { Logger } from '@meridian/logger';

const route = new Hono<HonoEnv>()
  .get('/settings', async c => {
    if (!hasValidAuthToken(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const db = getDb(c.env.HYPERDRIVE);
    const analysisMode = await getSetting(db, SETTINGS_KEYS.ARTICLE_ANALYSIS_MODE, 'serial');
    
    // Get LLM settings
    const llmProvider = await getSetting(db, SETTINGS_KEYS.LLM_PROVIDER, 'google');
    const llmModel = await getSetting(db, SETTINGS_KEYS.LLM_MODEL, '');
    // Don't return API key and BaseURL by default for security, or maybe we should?
    // For now, let's return them as this is a personal tool
    const llmApiKey = await getSetting(db, SETTINGS_KEYS.LLM_API_KEY, '');
    const llmBaseURL = await getSetting(db, SETTINGS_KEYS.LLM_BASE_URL, '');

    return c.json({
      settings: {
        [SETTINGS_KEYS.ARTICLE_ANALYSIS_MODE]: analysisMode,
        [SETTINGS_KEYS.LLM_PROVIDER]: llmProvider,
        [SETTINGS_KEYS.LLM_MODEL]: llmModel,
        [SETTINGS_KEYS.LLM_API_KEY]: llmApiKey,
        [SETTINGS_KEYS.LLM_BASE_URL]: llmBaseURL,
      }
    });
  })
  .post('/settings', async c => {
    if (!hasValidAuthToken(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const body = await c.req.json();
    const db = getDb(c.env.HYPERDRIVE);
    
    if (body[SETTINGS_KEYS.ARTICLE_ANALYSIS_MODE]) {
      const mode = body[SETTINGS_KEYS.ARTICLE_ANALYSIS_MODE];
      if (mode !== 'serial' && mode !== 'parallel') {
        return c.json({ error: 'Invalid mode' }, 400);
      }
      await setSetting(db, SETTINGS_KEYS.ARTICLE_ANALYSIS_MODE, mode, 'Article analysis concurrency mode');
    }

    // LLM Settings
    if (body[SETTINGS_KEYS.LLM_PROVIDER]) {
        await setSetting(db, SETTINGS_KEYS.LLM_PROVIDER, body[SETTINGS_KEYS.LLM_PROVIDER], 'LLM Provider');
    }
    if (body[SETTINGS_KEYS.LLM_MODEL] !== undefined) {
        await setSetting(db, SETTINGS_KEYS.LLM_MODEL, body[SETTINGS_KEYS.LLM_MODEL], 'LLM Model Name');
    }
    if (body[SETTINGS_KEYS.LLM_API_KEY] !== undefined) {
        await setSetting(db, SETTINGS_KEYS.LLM_API_KEY, body[SETTINGS_KEYS.LLM_API_KEY], 'LLM API Key');
    }
    if (body[SETTINGS_KEYS.LLM_BASE_URL] !== undefined) {
        await setSetting(db, SETTINGS_KEYS.LLM_BASE_URL, body[SETTINGS_KEYS.LLM_BASE_URL], 'LLM Base URL');
    }
    
    return c.json({ success: true });
  })
  .post('/briefs/trigger', async c => {
    // auth check
    if (!hasValidAuthToken(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { hoursLookback } = await c.req.json().catch(() => ({ hoursLookback: 24 }));

    // Trigger the workflow
    // We pass 'force: true' to indicate this is a manual trigger
    const instance = await c.env.GENERATE_BRIEF_WORKFLOW.create({
      params: {
        force: true,
        hoursLookback: Number(hoursLookback) || 24,
      },
    });

    return c.json({
      success: true,
      instanceId: instance.id,
      message: 'Brief generation triggered',
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
  })
  // 新增：文章状态诊断 API
  .get('/diagnostic/articles-status', async c => {
    const logger = new Logger({ api: 'diagnostic/articles-status' });

    if (!hasValidAuthToken(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDb(c.env.HYPERDRIVE);

    try {
      // 1. 统计各状态文章数量
      const allItems = await db.select({ status: $ingested_items.status }).from($ingested_items);
      const statusCounts = allItems.reduce((acc: Record<string, number>, item) => {
        const status = item.status || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // 2. 获取最近10条 PROCESSED 文章（含 embedding 信息）
      const recentProcessed = await db
        .select({
          id: $ingested_items.id,
          title: $ingested_items.display_title,
          processed_at: $ingested_items.processed_at,
          has_embedding: isNotNull($ingested_items.embedding)
        })
        .from($ingested_items)
        .where(eq($ingested_items.status, 'PROCESSED'))
        .orderBy(desc($ingested_items.processed_at))
        .limit(10);

      // 3. 获取最近10条 FAILED 文章（含失败原因）
      const recentFailed = await db
        .select({
          id: $ingested_items.id,
          title: $ingested_items.display_title,
          status: $ingested_items.status,
          fail_reason: $ingested_items.fail_reason,
          processed_at: $ingested_items.processed_at
        })
        .from($ingested_items)
        .where(
          // 使用 OR 条件匹配所有 FAILED 开头的状态
          inArray($ingested_items.status, [
            'FAILED_FETCH',
            'FAILED_RENDER',
            'FAILED_PROCESSING',
            'FAILED_EMBEDDING',
            'FAILED_R2_UPLOAD'
          ])
        )
        .orderBy(desc($ingested_items.processed_at))
        .limit(10);

      logger.info('文章状态诊断成功', {
        status_counts: statusCounts,
        recent_processed_count: recentProcessed.length,
        recent_failed_count: recentFailed.length
      });

      return c.json({
        success: true,
        data: {
          status_counts: statusCounts,
          recent_processed: recentProcessed,
          recent_failed: recentFailed
        }
      });
    } catch (error) {
      logger.error('文章状态诊断失败', error instanceof Error ? error : new Error(String(error)));
      return c.json({
        error: '诊断失败',
        message: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  })
  // 新增：ML Service 健康检查 API
  .get('/diagnostic/ml-health', async c => {
    const logger = new Logger({ api: 'diagnostic/ml-health' });

    if (!hasValidAuthToken(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const startTime = Date.now();
      const mlServiceUrl = c.env.MERIDIAN_ML_SERVICE_URL;
      const apiKey = c.env.MERIDIAN_ML_SERVICE_API_KEY;

      if (!mlServiceUrl) {
        return c.json({
          success: false,
          status: 'unhealthy',
          message: 'ML Service URL 未配置'
        }, 500);
      }

      // 仅检查 HTTP 连接性，不实际生成 embedding
      const response = await fetch(`${mlServiceUrl}/health`, {
        method: 'GET',
        headers: apiKey ? {
          'Authorization': `Bearer ${apiKey}`
        } : {},
        signal: AbortSignal.timeout(10000) // 10秒超时
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        logger.info('ML Service 健康检查通过', {
          response_time_ms: responseTime,
          status_code: response.status
        });

        return c.json({
          success: true,
          status: 'healthy',
          message: 'ML Service 正常',
          response_time_ms: responseTime
        });
      } else {
        const errorText = await response.text();
        logger.warn('ML Service 健康检查失败', {
          response_time_ms: responseTime,
          status_code: response.status,
          error_text: errorText
        });

        return c.json({
          success: false,
          status: 'unhealthy',
          message: `ML Service 返回错误: ${response.status} ${errorText}`,
          response_time_ms: responseTime
        }, 503);
      }
    } catch (error) {
      const responseTime = Date.now() - (error as any).startTime || 0;
      logger.error('ML Service 健康检查异常', error instanceof Error ? error : new Error(String(error)), {
        response_time_ms: responseTime
      });

      return c.json({
        success: false,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
        response_time_ms: responseTime
      }, 503);
    }
  })
  // 新增：批量重新处理 API
  .post('/articles/reprocess-batch', async c => {
    const logger = new Logger({ api: 'articles/reprocess-batch' });

    if (!hasValidAuthToken(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDb(c.env.HYPERDRIVE);

    try {
      const body = await c.req.json().catch(() => ({}));
      const status = body.status || ['NEW', 'FAILED_FETCH', 'FAILED_RENDER'];
      const limit = body.limit || 100;

      // 验证 status 参数
      const validStatuses = [
        'NEW',
        'PENDING_PROCESSING',
        'PROCESSED',
        'FAILED_FETCH',
        'FAILED_RENDER',
        'FAILED_PROCESSING',
        'FAILED_EMBEDDING',
        'FAILED_R2_UPLOAD',
        'SKIPPED_PDF',
        'SKIPPED_TOO_OLD'
      ];

      const invalidStatuses = status.filter((s: string) => !validStatuses.includes(s));
      if (invalidStatuses.length > 0) {
        return c.json({
          error: 'Invalid status',
          message: `无效的状态: ${invalidStatuses.join(', ')}`,
          valid_statuses: validStatuses
        }, 400);
      }

      // 查询符合条件的文章
      const articles = await db
        .select({ id: $ingested_items.id })
        .from($ingested_items)
        .where(inArray($ingested_items.status, status))
        .limit(limit);

      if (articles.length === 0) {
        logger.info('无符合条件的文章', { status, limit });
        return c.json({
          success: true,
          message: '无符合条件的文章',
          count: 0
        });
      }

      const ids = articles.map(a => a.id);

      // 调用工作流
      const result = await startProcessArticleWorkflow(c.env, { ingested_item_ids: ids });

      if (result.isErr()) {
        logger.error('批量重新处理失败', result.error);
        return c.json({
          error: '工作流创建失败',
          message: result.error.message,
          details: result.error.stack
        }, 500);
      }

      logger.info('批量重新处理成功', {
        count: ids.length,
        workflow_id: result.value.id,
        status
      });

      return c.json({
        success: true,
        message: `已提交 ${ids.length} 篇文章处理`,
        count: ids.length,
        workflow_id: result.value.id
      });
    } catch (error) {
      logger.error('批量重新处理异常', error instanceof Error ? error : new Error(String(error)));
      return c.json({
        error: '处理失败',
        message: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

export default route;
