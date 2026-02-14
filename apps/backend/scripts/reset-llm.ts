import { getDb } from '../src/lib/utils';
import { setSetting } from '../src/lib/settings';
import { Logger } from '@meridian/logger';

interface Env {
  DATABASE_URL?: string;
  HYPERDRIVE?: any;
  // 其他环境变量...
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const logger = new Logger({ script: 'reset-llm' });
    const db = getDb(env.HYPERDRIVE || env.DATABASE_URL);

    try {
      logger.info('开始重置 LLM 配置...');

      // 重置为 Google Gemini 默认配置
      await setSetting(db, 'llm_provider', 'google', 'LLM 提供商 (google|openai|glm)');
      await setSetting(db, 'llm_model', 'gemini-2.0-flash-001', 'LLM 模型名称');
      await setSetting(db, 'llm_base_url', '', 'LLM API Base URL');

      logger.info('✅ LLM 配置重置完成');

      return new Response(JSON.stringify({
        success: true,
        message: 'LLM 配置已重置为默认值',
        config: {
          provider: 'google',
          model: 'gemini-2.0-flash-001',
          base_url: ''
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('重置配置失败', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
