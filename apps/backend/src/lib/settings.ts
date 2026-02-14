import { $system_settings, eq } from '@meridian/database';
import type { getDb } from './utils';

type DrizzleDB = ReturnType<typeof getDb>;

export const SETTINGS_KEYS = {
  ARTICLE_ANALYSIS_MODE: 'article_analysis_mode', // 'serial' | 'parallel'
  LLM_PROVIDER: 'llm_provider', // 'google' | 'openai'
  LLM_API_KEY: 'llm_api_key',
  LLM_BASE_URL: 'llm_base_url',
  LLM_MODEL: 'llm_model',
} as const;

export async function getSetting(db: DrizzleDB, key: string, defaultValue: string): Promise<string> {
  try {
    const result = await db
      .select({ value: $system_settings.value })
      .from($system_settings)
      .where(eq($system_settings.key, key))
      .limit(1);

    return result[0]?.value ?? defaultValue;
  } catch (e) {
    console.error(`Failed to get setting ${key}:`, e);
    return defaultValue;
  }
}

export async function setSetting(db: DrizzleDB, key: string, value: string, description?: string): Promise<void> {
  await db
    .insert($system_settings)
    .values({
      key,
      value,
      description,
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: $system_settings.key,
      set: {
        value,
        updated_at: new Date(),
      },
    });
}
