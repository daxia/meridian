import app from './app';
import { DataSourceIngestorDO } from './durable_objects/dataSourceIngestorDO';
import { Logger } from '@meridian/logger';
import { type ProcessArticlesParams, startProcessArticleWorkflow } from './workflows/processIngestedItem.workflow';
import { GenerateBriefWorkflow, type GenerateBriefParams } from './workflows/generateBrief.workflow';
import { getDb } from './lib/utils';
import { $data_sources } from '@meridian/database';

export type Env = {
  // Bindings
  ARTICLES_BUCKET: R2Bucket;
  ARTICLE_PROCESSING_QUEUE: Queue<ProcessArticlesParams>;
  DATA_SOURCE_INGESTOR: DurableObjectNamespace<DataSourceIngestorDO>;
  PROCESS_INGESTED_ITEM: Workflow<ProcessArticlesParams>;
  GENERATE_BRIEF_WORKFLOW: Workflow<GenerateBriefParams>;
  HYPERDRIVE: Hyperdrive;

  // Secrets
  API_TOKEN: string;

  AXIOM_DATASET: string | undefined; // optional, use if you want to send logs to axiom
  AXIOM_TOKEN: string | undefined; // optional, use if you want to send logs to axiom

  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;

  DATABASE_URL: string;

  GEMINI_API_KEY: string;
  GEMINI_BASE_URL: string;

  MERIDIAN_ML_SERVICE_URL: string;
  MERIDIAN_ML_SERVICE_API_KEY: string;
};

// Create a base logger for the queue handler
const queueLogger = new Logger({ service: 'article-queue-handler' });

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<ProcessArticlesParams>, env: Env): Promise<void> {
    const batchLogger = queueLogger.child({ batch_size: batch.messages.length });
    batchLogger.info('收到一批待处理的文章');

    const articlesToProcess: number[] = [];
    for (const message of batch.messages) {
      const { ingested_item_ids } = message.body as ProcessArticlesParams;
      batchLogger.debug('正在处理消息', { message_id: message.id, article_count: ingested_item_ids.length });

      for (const id of ingested_item_ids) {
        articlesToProcess.push(id);
      }
    }

    batchLogger.info('从批次中提取文章', { total_articles: articlesToProcess.length });

    if (articlesToProcess.length === 0) {
      batchLogger.info('队列批次为空，无内容处理');
      batch.ackAll(); // Acknowledge the empty batch
      return;
    }

    // Process articles in chunks of 96
    const CHUNK_SIZE = 96;
    const articleChunks = [];
    for (let i = 0; i < articlesToProcess.length; i += CHUNK_SIZE) {
      articleChunks.push(articlesToProcess.slice(i, i + CHUNK_SIZE));
    }

    batchLogger.info('文章分块完成', { chunk_count: articleChunks.length });

    // Process each chunk sequentially
    for (const chunk of articleChunks) {
      const workflowResult = await startProcessArticleWorkflow(env, { ingested_item_ids: chunk });
      if (workflowResult.isErr()) {
        queueLogger.error(
          '触发文章处理工作流失败',
          workflowResult.error,
          { error_message: workflowResult.error.message, chunk_size: chunk.length }
        );
        // Retry the entire batch if Workflow creation failed
        batch.retryAll({ delaySeconds: 30 }); // Retry after 30 seconds
        return;
      }

      queueLogger.info('成功触发文章处理工作流', {
        workflow_id: workflowResult.value.id,
        chunk_size: chunk.length,
      });
    }

    batch.ackAll(); // Acknowledge the entire batch after all chunks are processed
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const logger = new Logger({ service: 'source-monitor' });

    // Handle Cron Triggers
    if (event.cron === '0 6,18 * * *') { // 6 AM and 6 PM
        logger.info('Triggering Scheduled Intelligence Brief Generation');
        await env.GENERATE_BRIEF_WORKFLOW.create({
            id: `brief-${new Date().toISOString()}`,
            params: { hoursLookback: 12 }
        });
        return; // Skip source check if it's the brief trigger? Or run both? 
        // The event object has a 'cron' property matching the trigger.
    }

    // Use the utility function that handles Hyperdrive connection string
    const db = getDb(env.HYPERDRIVE);

    try {
      const sources = await db.select().from($data_sources);
      const now = Date.now();

      for (const source of sources) {
        // Frequency is in minutes. Default to 240 if null/undefined
        const frequencyMs = (source.scrape_frequency_minutes || 240) * 60 * 1000;
        
        // Base time priority: lastChecked -> do_initialized_at -> created_at -> now
        // Note: Dates from Drizzle are Date objects
        const lastTime = source.lastChecked || source.do_initialized_at || source.created_at || new Date();
        const nextCheck = lastTime.getTime() + frequencyMs;
        
        const diffMs = nextCheck - now;
        const diffSec = Math.round(diffMs / 1000);
        
        logger.info(`[SourceMonitor] 源 ${source.name} (ID: ${source.id}) 距离下次抓取还有 ${diffSec} 秒`, {
          source_id: source.id,
          source_name: source.name,
          last_checked: source.lastChecked,
          frequency_minutes: source.scrape_frequency_minutes,
          next_fetch_in_seconds: diffSec
        });
      }
    } catch (error) {
      logger.error('源状态监控失败', { error: error instanceof Error ? error.message : String(error) });
    }
  },
} satisfies ExportedHandler<Env>;

export { DataSourceIngestorDO };
export { ProcessIngestedItemWorkflow } from './workflows/processIngestedItem.workflow';
export { GenerateBriefWorkflow } from './workflows/generateBrief.workflow';
