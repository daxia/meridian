export default defineEventHandler(async event => {
  await requireUserSession(event);
  const config = useRuntimeConfig();

  try {
    const response = await fetch(`${config.public.WORKER_API}/admin/settings`, {
      headers: {
        Authorization: `Bearer ${config.worker.api_token}`,
      },
    });
    
    if (!response.ok) {
        throw new Error(`Worker returned ${response.status}: ${await response.text()}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch settings', error);
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch settings' });
  }
});
