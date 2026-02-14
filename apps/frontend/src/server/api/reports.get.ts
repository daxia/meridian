import { ensureDate, formatReportDate, generateReportSlug, getDB } from '~/server/lib/utils';

export default defineEventHandler(async event => {
  const reports = await getDB(event).query.$reports.findMany();

  // Process reports to add date and slug
  const processedReports = reports
    .map(report => {
      const createdAt = ensureDate(report.created_at);
      return {
        ...report,
        date: formatReportDate(createdAt),
        slug: generateReportSlug(createdAt),
      };
    })
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

  return processedReports;
});
