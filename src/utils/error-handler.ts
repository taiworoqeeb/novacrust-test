import { logger } from './logger';

type Cleanup = () => Promise<void> | void;

export const registerGlobalErrorHandlers = (cleanup?: Cleanup) => {
  const shutdown = async (reason: string, error?: unknown) => {
    if (error instanceof Error) {
      logger.error(`Shutdown due to ${reason}: ${error.message}`, { stack: error.stack });
    } else if (error) {
      logger.error(`Shutdown due to ${reason}: ${JSON.stringify(error)}`);
    } else {
      logger.error(`Shutdown due to ${reason}`);
    }
    try {
      await cleanup?.();
    } catch (cleanupErr) {
      logger.error('Error during cleanup', cleanupErr as Error);
    } finally {
      process.exit(1);
    }
  };

  process.on('uncaughtException', (err) => shutdown('uncaughtException', err));
  process.on('unhandledRejection', (reason) => shutdown('unhandledRejection', reason as Error));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

