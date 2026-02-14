import MailerLite from '@mailerlite/mailerlite-nodejs';
import { $newsletter } from '@meridian/database';
import { z } from 'zod';
import { getDB } from '../lib/utils';

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event);

  // Parse the request body to get the email
  const body = await readBody(event);
  const bodyContent = z.object({ email: z.string().email() }).safeParse(body);
  if (bodyContent.success === false) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email format' });
  }

  try {
    // Insert email into the newsletter table
    await Promise.all([
      getDB(event).insert($newsletter).values({ email: bodyContent.data.email }).onConflictDoNothing(),
      (async () => {
        if (!config.mailerlite.api_key || !config.mailerlite.group_id) {
          console.warn('MailerLite is not configured, skipping subscription sync.');
          return;
        }
        
        try {
          const mailerlite = new MailerLite({ api_key: config.mailerlite.api_key });
          await mailerlite.subscribers.createOrUpdate({
            email: bodyContent.data.email,
            groups: [config.mailerlite.group_id],
          });
        } catch (error) {
          // Log the error but do not fail the request if MailerLite sync fails
          // This ensures the user still gets a success response for the DB insertion
          console.error('MailerLite sync failed (non-fatal):', error);
        }
      })(),
    ]);

    return { success: true, message: 'Successfully subscribed' };
  } catch (error) {
    console.error('Database error:', error);
    throw createError({ statusCode: 500, statusMessage: 'Database error' });
  }
});
