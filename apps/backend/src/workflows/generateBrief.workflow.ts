import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep, type WorkflowStepConfig } from 'cloudflare:workers';
import { $ingested_items, $reports, and, eq, gte, isNotNull } from '@meridian/database';
import { Logger } from '@meridian/logger';
import { getDb } from '../lib/utils';
import type { Env } from '../index';
import { clusterEmbeddings } from '../lib/clustering';
import { createGoogleGenerativeAI, google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { getClusterSummaryPrompt } from '../prompts/clusterSummary.prompt';

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

    logger.info('Starting Intelligence Brief Generation');

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
            isNotNull($ingested_items.embedding),
            gte($ingested_items.processed_at, since)
          )
        );
    });

    if (articles.length === 0) {
      logger.info('No articles found in the last ' + lookbackHours + ' hours.');
      return;
    }

    logger.info(`Fetched ${articles.length} articles for processing.`);

    // 2. Cluster Articles
    const clusteringResult = await step.do('cluster-articles', mlStepConfig, async () => {
      // Extract embeddings as number[][]
      // Note: pgvector returns number[] but Drizzle type might differ, casting safely
      const embeddings = articles.map(a => a.embedding as number[]);
      
      const result = await clusterEmbeddings(env, embeddings, 2); // Min cluster size 2
      if (result.isErr()) {
        throw new Error(`Clustering failed: ${result.error.message}`);
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

    const googleAI = createGoogleGenerativeAI({
      apiKey: env.GEMINI_API_KEY,
      baseURL: env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
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

        const response = await generateText({
          model: google('gemini-2.0-flash-001'),
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
            logger.error(`Failed to parse JSON for cluster ${label}`, { text, error: errorMessage });
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
    await step.do('save-report', dbStepConfig, async () => {
      await db.insert($reports).values({
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
        model_author: 'gemini-2.0-flash-001',
      });
    });

    logger.info('Brief generation completed and saved.');
  }
}
