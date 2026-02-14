
import { createLogger, type Logger } from '@meridian/logger';

export default defineNuxtPlugin((nuxtApp) => {
  const logger = createLogger({
    service: 'frontend',
    // In browser, window exists. In server, it doesn't.
    environment: import.meta.client ? 'browser' : 'server'
  });

  return {
    provide: {
      logger
    }
  };
});
