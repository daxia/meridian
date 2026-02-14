import { getDB } from '~/server/lib/utils';
import { $data_sources, eq } from '@meridian/database';

export default defineEventHandler(async event => {
  await requireUserSession(event); // require auth

  const sourceId = Number(getRouterParam(event, 'id'));
  if (Number.isNaN(sourceId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid source ID' });
  }

  const db = getDB(event);
  const config = useRuntimeConfig();

  const source = await db.query.$data_sources.findFirst({ where: eq($data_sources.id, sourceId) });
  if (source === undefined) {
    throw createError({ statusCode: 404, statusMessage: 'Source not found' });
  }

  try {
    await fetch(`${config.public.WORKER_API}/do/admin/source/${sourceId}/trigger`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.worker.api_token}`,
      },
    });
  } catch (error) {
    console.error('触发抓取失败', error);
    throw createError({ statusCode: 500, statusMessage: '触发抓取失败' });
  }

  return { success: true };
});
