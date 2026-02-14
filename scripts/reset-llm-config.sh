#!/bin/bash

# 重置 LLM 配置 SQL 脚本

cat << 'EOF' > /tmp/reset_llm_config.sql
-- 重置 LLM 配置为默认值
INSERT INTO system_settings (key, value, description, updated_at)
VALUES
  ('llm_provider', 'google', 'LLM 提供商 (google|openai|glm)', NOW()),
  ('llm_model', 'gemini-2.0-flash-001', 'LLM 模型名称', NOW()),
  ('llm_base_url', '', 'LLM API Base URL', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- 显示当前配置
SELECT key, value, updated_at
FROM system_settings
WHERE key LIKE 'llm_%'
ORDER BY key;
EOF

echo "📦 已生成 SQL 脚本: /tmp/reset_llm_config.sql"
echo ""
echo "请在数据库中执行以下命令:"
echo "psql $DATABASE_URL -f /tmp/reset_llm_config.sql"
