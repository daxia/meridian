export default defineEventHandler(async event => {
  await requireUserSession(event);

  const config = useRuntimeConfig();

  try {
    const response = await fetch(`${config.public.WORKER_API}/admin/briefs/trigger`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.worker.api_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to trigger briefing workflow', error);
    throw createError({ statusCode: 500, statusMessage: 'Failed to trigger workflow' });
  }
});
