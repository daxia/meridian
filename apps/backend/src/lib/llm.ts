import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { Env } from '../index';

export type LLMProvider = 'google' | 'openai' | 'glm';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseURL?: string;
  modelName?: string;
}

/**
 * Creates an AI SDK LanguageModel instance based on configuration.
 * Supports Google (Gemini) and OpenAI compatible providers (including GLM).
 */
export function createLLMModel(env: Env, config: LLMConfig) {
  const provider = config.provider || 'google';

  if (provider === 'glm') {
    // GLM (Zhipu AI) is OpenAI compatible
    const openai = createOpenAI({
      apiKey: config.apiKey || env.GLM_API_KEY,
      baseURL: config.baseURL || env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/',
    });

    return openai(config.modelName || 'glm-4-flash');
  }

  if (provider === 'openai') {
    // For OpenAI compatible providers (DeepSeek, OpenRouter, etc.)
    const openai = createOpenAI({
      apiKey: config.apiKey || env.OPENAI_API_KEY,
      baseURL: config.baseURL || env.OPENAI_BASE_URL,
    });
    
    // Default to gpt-4o-mini if not specified, but usually should be
    return openai(config.modelName || 'gpt-4o-mini');
  }

  // Default to Google/Gemini
  const google = createGoogleGenerativeAI({
    apiKey: config.apiKey || env.GEMINI_API_KEY,
    baseURL: config.baseURL || env.GEMINI_BASE_URL,
  });
  
  // Default to Gemini 2.0 Flash
  return google(config.modelName || 'gemini-2.0-flash-001');
}
