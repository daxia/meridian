export default defineEventHandler(async event => {
  await requireUserSession(event);
  const config = useRuntimeConfig();
  const body = await readBody(event);

  try {
    const response = await fetch(`${config.public.WORKER_API}/admin/settings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.worker.api_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Worker returned ${response.status}: ${await response.text()}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to update settings', error);
    throw createError({ statusCode: 500, statusMessage: 'Failed to update settings' });
  }
});
