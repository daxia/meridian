import { $reports, desc } from '@meridian/database';
import { ensureDate, generateReportSlug, getDB } from '~/server/lib/utils';

export default defineEventHandler(async event => {
  const latestReport = await getDB(event).query.$reports.findFirst({
    orderBy: desc($reports.created_at),
    columns: { id: true, created_at: true, title: true },
  });
  if (latestReport === undefined) {
    throw createError({ statusCode: 404, statusMessage: 'No reports found' });
  }

  return generateReportSlug(ensureDate(latestReport.created_at));
});
