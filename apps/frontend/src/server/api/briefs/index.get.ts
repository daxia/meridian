import { $reports, desc } from '@meridian/database';
import { ensureDate, formatReportDate, generateReportSlug, getDB } from '~/server/lib/utils';

export default defineEventHandler(async event => {
  const reports = await getDB(event).query.$reports.findMany({
    orderBy: desc($reports.created_at),
    columns: { id: true, created_at: true, title: true },
  });

  // Process reports to add date and slug
  return reports.map(report => {
    const createdAt = ensureDate(report.created_at);
    return {
      ...report,
      date: formatReportDate(createdAt),
      slug: generateReportSlug(createdAt),
    };
  });
});
