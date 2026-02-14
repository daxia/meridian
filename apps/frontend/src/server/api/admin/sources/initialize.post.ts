import { defineEventHandler, createError } from 'h3';

export default defineEventHandler(async event => {
  console.log('[initialize.post] 收到初始化调度器请求');

  // 检查 session
  const session = await getUserSession(event);
  console.log('[initialize.post] 当前 session:', session);

  if (!session?.user?.login) {
    console.error('[initialize.post] 未授权访问，缺少用户 session');
    throw createError({ statusCode: 401, statusMessage: '未登录，请先登录' });
  }

  const config = useRuntimeConfig();
  console.log('[initialize.post] 配置已加载，准备调用 Backend API');

  try {
    const result = await $fetch(`${config.public.WORKER_API}/do/admin/initialize-dos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.worker.api_token}`,
      },
    });
    console.log('[initialize.post] Backend 响应:', result);
    return result;
  } catch (error: any) {
    console.error('[initialize.post] 初始化 DOs 失败:', error);
    const errorMsg = error.message || error.data?.message || error.statusMessage || '未知错误';
    throw createError({ statusCode: 500, statusMessage: `初始化 DOs 失败: ${errorMsg}` });
  }
});
