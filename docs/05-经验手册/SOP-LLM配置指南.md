# LLM 多模型配置与切换指南

本文档描述如何在 Meridian 系统中配置和切换不同的大语言模型（LLM）提供商，目前支持 Google Gemini 和 Zhipu AI (GLM)，并预留了 OpenAI 兼容接口的支持。

## 1. 支持的模型提供商

| 提供商 | 标识 (`llm_provider`) | 默认模型 | 环境变量 (API Key) | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| **Google** | `google` | `gemini-2.0-flash-001` | `GEMINI_API_KEY` | 默认提供商，适合大多数场景 |
| **Zhipu AI** | `glm` | `glm-4-flash` | `GLM_API_KEY` | 智谱 AI (OpenAI 兼容协议) |
| **OpenAI** | `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` | 通用 OpenAI 兼容接口 |

## 2. 配置方式

系统支持两种配置方式：**前端界面配置**（推荐，无需重启）和 **环境变量**（用于初始设置）。

### 2.1 前端界面配置 (推荐)

系统提供了可视化配置界面，允许在运行时动态切换模型和参数，配置立即生效。

1.  登录 Admin 管理面板。
2.  点击左侧导航栏的 **Settings**。
3.  在 **LLM Configuration** 区域进行配置：
    *   **Provider**: 选择模型提供商（如 `Google Gemini` 或 `Zhipu AI (GLM)`）。
    *   **Model Name**: 输入具体的模型名称（如 `glm-4-plus`）。留空则使用该提供商的默认模型。
    *   **API Key**: 输入对应的 API Key。
        *   *注意*：如果在此处填写，将覆盖环境变量中的设置。
        *   *建议*：生产环境建议留空，使用环境变量管理敏感密钥；仅在测试或临时切换时在此处填写。
    *   **Base URL**: (可选) 自定义 API 端点地址，用于代理或私有部署模型。
4.  点击 **Save Settings** 保存。

此外，该页面还包含 **Analysis Settings**，可设置文章分析的并发模式：
*   **Parallel**: 并发处理（速度快，但容易触发 Rate Limit）。
*   **Serial**: 串行处理（速度慢，但稳定，适合配额较低的 Key）。

### 2.2 环境变量配置

在 `apps/backend/.dev.vars` (开发环境) 或 Cloudflare Worker 环境变量中设置默认值：

```bash
# Google Gemini
GEMINI_API_KEY="your-gemini-key"

# Zhipu AI (GLM)
GLM_API_KEY="your-glm-key"
# 可选：自定义 Base URL
# GLM_BASE_URL="https://open.bigmodel.cn/api/paas/v4/"
```

### 2.3 API 动态切换

也可直接调用 Admin API 进行切换：

```bash
# 切换到 GLM
curl -X POST http://localhost:8787/admin/settings \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "llm_provider": "glm",
    "llm_model": "glm-4-flash",
    "llm_api_key": "your-glm-api-key" 
  }'
```

## 3. 开发指南与常见问题

### 3.1 添加新的 LLM 提供商

若需支持新的提供商（如 DeepSeek），请修改 `apps/backend/src/lib/llm.ts` 中的 `createLLMModel` 函数：

```typescript
export function createLLMModel(env: Env, config: LLMConfig) {
  // ...
  if (provider === 'deepseek') {
    const openai = createOpenAI({
      apiKey: config.apiKey || env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });
    return openai(config.modelName || 'deepseek-chat');
  }
  // ...
}
```

### 3.2 常见错误：类型不兼容 (LanguageModelV1 vs V3)

**现象**：
在编译或开发时遇到如下 TypeScript 错误：
> Property 'defaultObjectGenerationMode' is missing in type 'LanguageModelV3' but required in type 'LanguageModelV1'.

**原因**：
Vercel AI SDK 的不同提供商包（`@ai-sdk/google` 和 `@ai-sdk/openai`）可能依赖不同版本的内部接口定义。例如，Google 包返回的是 V3 接口，而 OpenAI 包返回的是 V1 接口。如果在 `createLLMModel` 函数中显式指定返回类型为 `LanguageModel`，TypeScript 会尝试找到一个能同时满足所有版本的类型，导致冲突。

**解决方案**：
**不要**在 `createLLMModel` 函数中显式声明返回类型。让 TypeScript 根据实际返回的对象（`return openai(...)` 或 `return google(...)`）自动推断类型。

**正确写法**：
```typescript
// ✅ 推荐：不写返回类型，让 TS 自动推断
export function createLLMModel(env: Env, config: LLMConfig) {
  if (config.provider === 'glm') {
    return openai('...');
  }
  return google('...');
}
```

**错误写法**：
```typescript
// ❌ 错误：显式指定类型会导致版本冲突
import { LanguageModel } from 'ai';
export function createLLMModel(env: Env, config: LLMConfig): LanguageModel { 
  // ...
}
```
