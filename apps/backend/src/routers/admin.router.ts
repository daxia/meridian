import { Hono } from 'hono';
import { Logger } from '@meridian/logger';
import type { HonoEnv } from '../app';
import { hasValidAuthToken } from '../lib/utils';

const logger = new Logger({ router: 'admin' });

const route = new Hono<HonoEnv>()
  .post('/briefs/trigger', async c => {
    if (!hasValidAuthToken(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const routeLogger = logger.child({ operation: 'trigger-brief' });
    routeLogger.info('Received request to trigger intelligence briefing');

    try {
      // Trigger the workflow
      const instance = await c.env.GENERATE_BRIEF_WORKFLOW.create({
        params: { force: true },
      });

      routeLogger.info('Successfully triggered briefing workflow', { instanceId: instance.id });
      return c.json({ success: true, instanceId: instance.id });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      routeLogger.error('Failed to trigger briefing workflow', error);
      return c.json({ error: 'Failed to trigger workflow' }, 500);
    }
  });

export default route;
