# LLM 多模型配置与切换指南

本文档描述如何在 Meridian 系统中配置和切换不同的大语言模型（LLM）提供商，目前支持 Google Gemini 和 Zhipu AI (GLM)。

## 1. 支持的模型提供商

| 提供商 | 标识 (`llm_provider`) | 默认模型 | 环境变量 (API Key) | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| **Google** | `google` | `gemini-2.0-flash-001` | `GEMINI_API_KEY` | 默认提供商 |
| **Zhipu AI** | `glm` | `glm-4-flash` | `GLM_API_KEY` | 智谱 AI (OpenAI 兼容) |
| **OpenAI** | `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` | 通用 OpenAI 兼容接口 |

## 2. 配置方式

系统支持两种配置方式：**环境变量**（推荐用于生产环境密钥）和 **动态设置**（推荐用于运行时切换）。

### 2.1 环境变量配置

在 `apps/backend/.dev.vars` (开发环境) 或 Cloudflare Worker 环境变量中设置：

```bash
# Google Gemini
GEMINI_API_KEY="your-gemini-key"

# Zhipu AI (GLM)
GLM_API_KEY="your-glm-key"
# 可选：自定义 Base URL
# GLM_BASE_URL="https://open.bigmodel.cn/api/paas/v4/"
```

### 2.2 动态切换 (API)

使用 `POST /admin/settings` 接口可以动态切换模型，无需重启服务。

#### 切换到 GLM (Zhipu AI)

```bash
curl -X POST http://localhost:8787/admin/settings \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "llm_provider": "glm",
    "llm_model": "glm-4-flash",
    "llm_api_key": "your-glm-api-key" 
  }'
```

> **注意**：如果在 API 中提供了 `llm_api_key`，它将覆盖环境变量中的设置。建议仅在测试或临时切换时通过 API 传递 Key。

#### 切换回 Google Gemini

```bash
curl -X POST http://localhost:8787/admin/settings \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "llm_provider": "google",
    "llm_model": "" 
  }'
```
*注：`llm_model` 设为空字符串时将使用提供商的默认模型。*

### 2.3 前端界面配置 (推荐)

系统提供了可视化配置界面，操作更加便捷：

1. 登录 Admin 面板。
2. 点击顶部导航栏的 **Settings**。
3. 在 **LLM Configuration** 区域选择 Provider 为 `Zhipu AI (GLM)`。
4. (可选) 输入 API Key（如果未配置环境变量）。
5. 点击 **Save Settings** 保存。

## 3. 查看当前配置

使用 `GET /admin/settings` 查看当前生效的配置：

```bash
curl http://localhost:8787/admin/settings \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

响应示例：
```json
{
  "settings": {
    "article_analysis_mode": "serial",
    "llm_provider": "glm",
    "llm_model": "glm-4-flash",
    "llm_api_key": "sk-...",
    "llm_base_url": ""
  }
}
```

## 4. 开发指南

### 添加新的 LLM 提供商

1. 修改 `apps/backend/src/lib/llm.ts` 中的 `createLLMModel` 函数。
2. 更新 `apps/backend/src/index.ts` 中的 `Env` 定义。
3. 更新 `apps/backend/src/lib/settings.ts` 中的类型注释。
