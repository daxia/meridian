import { defineEventHandler, createError } from 'h3';

export default defineEventHandler(async event => {
  await requireUserSession(event); // require auth

  const config = useRuntimeConfig();

  try {
    const result = await $fetch(`${config.public.WORKER_API}/do/admin/initialize-dos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.worker.api_token}`,
      },
    });
    return result;
  } catch (error: any) {
    console.error('初始化 DOs 失败', error);
    throw createError({ statusCode: 500, statusMessage: '初始化 DOs 失败' });
  }
});
