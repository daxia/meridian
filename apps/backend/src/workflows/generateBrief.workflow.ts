import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep, type WorkflowStepConfig } from 'cloudflare:workers';
import { $ingested_items, $reports, and, eq, gte, isNotNull } from '@meridian/database';
import { Logger } from '@meridian/logger';
import { getDb } from '../lib/utils';
import type { Env } from '../index';
import { clusterEmbeddings } from '../lib/clustering';
import { generateText } from 'ai';
import { getClusterSummaryPrompt } from '../prompts/clusterSummary.prompt';
import { createLLMModel, type LLMConfig, type LLMProvider } from '../lib/llm';
import { getSetting, SETTINGS_KEYS } from '../lib/settings';

const dbStepConfig: WorkflowStepConfig = {
  retries: { limit: 3, delay: '1 second', backoff: 'linear' },
  timeout: '10 seconds',
};

const mlStepConfig: WorkflowStepConfig = {
  retries: { limit: 2, delay: '2 seconds', backoff: 'exponential' },
  timeout: '30 seconds',
};

const llmStepConfig: WorkflowStepConfig = {
  retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' },
  timeout: '60 seconds',
};

export type GenerateBriefParams = {
  force?: boolean; // If true, ignore schedule/time checks (for manual triggering)
  hoursLookback?: number;
};

const workflowLogger = new Logger({ workflow: 'GenerateBrief' });

export class GenerateBriefWorkflow extends WorkflowEntrypoint<Env, GenerateBriefParams> {
  async run(event: WorkflowEvent<GenerateBriefParams>, step: WorkflowStep) {
    const env = this.env;
    const db = getDb(env.HYPERDRIVE);
    const logger = workflowLogger.child({
      workflow_id: event.instanceId,
      timestamp: new Date().toISOString(),
    });

    logger.info('Starting Intelligence Brief Generation (DEBUG MODE - embedding check disabled for testing)');

    // 1. Fetch recent processed articles with embeddings
    const lookbackHours = event.payload.hoursLookback || 24;
    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const articles = await step.do('fetch-articles', dbStepConfig, async () => {
      return db
        .select({
          id: $ingested_items.id,
          title: $ingested_items.display_title,
          content: $ingested_items.content_body_text,
          url: $ingested_items.url_to_original,
          sourceId: $ingested_items.data_source_id,
          embedding: $ingested_items.embedding,
        })
        .from($ingested_items)
        .where(
          and(
            eq($ingested_items.status, 'PROCESSED'),
            // 调试模式：移除 embedding IS NOT NULL 条件，允许没有 embedding 的文章也参与
            // isNotNull($ingested_items.embedding),
            gte($ingested_items.processed_at, since)
          )
        );
    });

    if (articles.length === 0) {
      const msg = 'No articles found in the last ' + lookbackHours + ' hours.';
      logger.info(msg);
      logger.warn('⚠️ 简报生成失败：没有找到任何符合条件的文章');
      logger.warn('📊 可能原因：1) RSS抓取未完成 2) 文章处理失败 3) 所有文章都没有embedding');
      return { success: false, message: msg };
    }

    // 📊 记录文章状态统计
    logger.info(`✅ 简报生成继续：使用 ${articles.length} 篇文章`);
    if (articlesWithoutEmbedding.length > 0) {
      logger.warn(`⚠️ 注意：${articlesWithoutEmbedding.length} 篇文章没有embedding，可能影响聚类质量`);
    }

    logger.info(`Fetched ${articles.length} articles for processing.`);

    // 📊 调试模式统计（已移除 embedding 检查）
    const articlesWithEmbedding = articles.filter(a => a.embedding !== null);
    const articlesWithoutEmbedding = articles.filter(a => a.embedding === null);
    const articlesProcessedToday = articles.filter(a => {
      const processedAt = a.processed_at;
      if (!processedAt) return false;
      const hoursAgo = (Date.now() - processedAt.getTime()) / (1000 * 60 * 60);
      return hoursAgo <= 24;
    });

    logger.info(`📊 调试统计: 总=${articles.length}, 有embedding=${articlesWithEmbedding.length}, 无embedding=${articlesWithoutEmbedding.length}, 24h内处理=${articlesProcessedToday.length}`);

    // ⚠️ 不阻塞主任务：即使部分文章处理失败，也继续尝试生成简报
    if (articlesWithoutEmbedding.length > 0) {
      logger.warn(`⚠️ 注意：${articlesWithoutEmbedding.length} 篇文章没有embedding，聚类功能可能受影响`);
    }

    // 2. Cluster Articles
    const clusteringResult = await step.do('cluster-articles', mlStepConfig, async () => {
      // Extract embeddings as number[][]
      // Note: pgvector returns number[] but Drizzle type might differ, casting safely
      const embeddings = articles.map(a => a.embedding as number[]);
      
      const result = await clusterEmbeddings(env, embeddings, 2); // Min cluster size 2
      if (result.isErr()) {
        const error = result.error as Error;
        throw new Error(`Clustering failed: ${error.message}`);
      }
      return result.value;
    });

    logger.info(`Clustering complete. Found ${clusteringResult.n_clusters} clusters.`);

    // Group articles by cluster
    const clusters: Record<number, typeof articles> = {};
    const noise: typeof articles = [];

    clusteringResult.labels.forEach((label, idx) => {
      if (label === -1) {
        noise.push(articles[idx]);
      } else {
        if (!clusters[label]) clusters[label] = [];
        clusters[label].push(articles[idx]);
      }
    });

    // 3. Summarize Clusters
    const clusterSummaries: any[] = [];
    
    // Sort clusters by size (descending)
    const sortedClusterLabels = Object.keys(clusters)
      .map(Number)
      .sort((a, b) => clusters[b].length - clusters[a].length);

    const llmConfig = await step.do('get llm config', dbStepConfig, async (): Promise<LLMConfig> => {
      const provider = (await getSetting(db, SETTINGS_KEYS.LLM_PROVIDER, 'google')) as LLMProvider;
      const apiKey = await getSetting(db, SETTINGS_KEYS.LLM_API_KEY, '');
      const baseURL = await getSetting(db, SETTINGS_KEYS.LLM_BASE_URL, '');
      const modelName = await getSetting(db, SETTINGS_KEYS.LLM_MODEL, '');
      return { provider, apiKey, baseURL, modelName };
    });

    for (const label of sortedClusterLabels) {
      const group = clusters[label];
      const summary = await step.do(`summarize-cluster-${label}`, llmStepConfig, async () => {
        const prompt = getClusterSummaryPrompt(
          group.map(a => ({
            title: a.title || 'Untitled',
            content: (a.content || '').substring(0, 1000), // Truncate for token limit
            source: a.url, // Ideally use source name, but URL is available
          }))
        );

        const model = createLLMModel(env, llmConfig);
        const response = await generateText({
          model: model as any,
          temperature: 0.2,
          prompt: prompt,
        });

        // Clean up JSON response if it contains markdown code blocks
        let text = response.text.trim();
        if (text.startsWith('```json')) {
            text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (text.startsWith('```')) {
            text = text.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        try {
            return JSON.parse(text);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            logger.error(`Failed to parse JSON for cluster ${label}`, undefined, { text_snippet: text.substring(0, 200), error_message: errorMessage });
            return {
                topic_title: "Processing Error",
                summary: "Could not generate summary.",
                key_points: []
            };
        }
      });
      
      clusterSummaries.push({
          ...summary,
          article_count: group.length,
          articles: group.map(a => ({ id: a.id, title: a.title, url: a.url }))
      });
    }

    // 4. Generate Final Report Content
    // For now, we store the raw structured data in content or formatted markdown
    const reportTitle = `Intelligence Brief - ${new Date().toLocaleDateString()}`;
    const reportContent = clusterSummaries.map(c => `
### ${c.topic_title} (${c.article_count} articles)
${c.summary}

**Key Points:**
${(c.key_points || []).map((p: string) => `- ${p}`).join('\n')}

**Sources:**
${c.articles.map((a: any) => `- [${a.title}](${a.url})`).join('\n')}
`).join('\n\n---\n\n');

    // 5. Save to Database
    const reportId = await step.do('save-report', dbStepConfig, async () => {
      const result = await db.insert($reports).values({
        title: reportTitle,
        content: reportContent,
        totalArticles: articles.length,
        totalSources: new Set(articles.map(a => a.sourceId)).size,
        usedArticles: articles.length - noise.length, // Rough count
        usedSources: 0, // Need to calc
        clustering_params: { 
            n_clusters: clusteringResult.n_clusters, 
            noise_count: noise.length 
        },
        tldr: `Generated ${clusteringResult.n_clusters} topics from ${articles.length} articles.`,
        model_author: llmConfig.modelName || (llmConfig.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash-001'),
      }).returning({ id: $reports.id });

      return result[0]?.id;
    });

    const successMsg = `Brief generation completed and saved. Report ID: ${reportId}`;
    logger.info(successMsg);
    return { success: true, message: successMsg, reportId };
  }
}
