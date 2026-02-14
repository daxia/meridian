
import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  await requireUserSession(event);

  try {
    const response = await $fetch(`${config.public.WORKER_API}/admin/articles/reprocess`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.worker.api_token}`,
      },
    });

    return response;
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      message: error.response?._data?.message || 'Failed to reprocess articles',
    });
  }
});
