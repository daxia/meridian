/**
 * 重置 LLM 配置脚本
 * 修复 GLM 模型名称错误
 */

const { Client } = require('@neondatabase/serverless');
const drizzle = require('drizzle-orm/postgres-js');
const fs = require('fs');
const path = require('path');

// 从 .dev.vars 读取数据库配置
const envPath = path.join(__dirname, '../apps/backend/.dev.vars');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnvVar = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
};

const DATABASE_URL = getEnvVar('DATABASE_URL');

if (!DATABASE_URL) {
  console.error('❌ 未找到 DATABASE_URL 环境变量');
  process.exit(1);
}

console.log('📦 连接数据库...');
const client = new Client(DATABASE_URL);
const db = drizzle.default(client);

async function resetLLMConfig() {
  try {
    await client.connect();
    console.log('✅ 数据库连接成功');

    // 重置 LLM 配置为默认值
    console.log('\n🔄 重置 LLM 配置...');

    const updates = [
      {
        key: 'llm_provider',
        value: 'google',
        description: 'LLM 提供商 (google|openai|glm)'
      },
      {
        key: 'llm_model',
        value: 'gemini-2.0-flash-001',
        description: 'LLM 模型名称'
      },
      {
        key: 'llm_base_url',
        value: '',
        description: 'LLM API Base URL'
      }
    ];

    for (const setting of updates) {
      await db.execute(`
        INSERT INTO system_settings (key, value, description, updated_at)
        VALUES ('${setting.key}', '${setting.value}', '${setting.description}', NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = '${setting.value}',
          updated_at = NOW()
      `);
      console.log(`✅ ${setting.key} = "${setting.value}"`);
    }

    console.log('\n✨ LLM 配置重置完成！');
    console.log('💡 现在使用 Google Gemini 作为默认提供商\n');

    // 显示当前配置
    const settings = await db.execute(`
      SELECT key, value, updated_at
      FROM system_settings
      WHERE key LIKE 'llm_%'
      ORDER BY key
    `);

    console.log('📋 当前 LLM 配置:');
    console.table(settings.rows);

  } catch (error) {
    console.error('❌ 重置失败:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetLLMConfig();
