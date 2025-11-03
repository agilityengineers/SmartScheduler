/**
 * Simple logger utility that respects LOG_LEVEL environment variable
 *
 * In production, only errors and warnings are logged by default.
 * In development, all logs are shown.
 *
 * Set LOG_LEVEL=debug to enable verbose logging in production.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Get current log level from environment
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'warn' : 'debug');

const currentLevelValue = logLevels[currentLevel];

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return logLevels[level] >= currentLevelValue;
}

/**
 * Logger object with conditional logging based on environment
 */
export const logger = {
  /**
   * Debug level - verbose logging for development
   * Only shows in development or when LOG_LEVEL=debug
   */
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info level - general information
   * Shows in development or when LOG_LEVEL=info or lower
   */
  info: (...args: any[]) => {
    if (shouldLog('info')) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Warning level - something unexpected but not critical
   * Shows in all environments unless LOG_LEVEL=error
   */
  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Error level - critical issues that need attention
   * Always shows in all environments
   */
  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  },

  /**
   * Log with timestamp (always shows)
   */
  timestamp: (...args: any[]) => {
    console.log(`[${new Date().toISOString()}]`, ...args);
  },
};

/**
 * Convenience function for logging API requests (debug level)
 */
export function logApiRequest(method: string, path: string, ...details: any[]) {
  logger.debug(`[API ${method}] ${path}`, ...details);
}

/**
 * Convenience function for logging API errors (error level)
 */
export function logApiError(method: string, path: string, error: Error | string) {
  logger.error(`[API ${method}] ${path} - Error:`, error);
}

// Log the current log level on startup
if (process.env.NODE_ENV === 'production') {
  console.log(`[LOGGER] Production mode - Log level: ${currentLevel}`);
} else {
  console.log(`[LOGGER] Development mode - Log level: ${currentLevel} (all logs enabled)`);
}

/**
 * Suppress verbose console.log in production while keeping errors/warnings
 * This wraps the native console to respect LOG_LEVEL in production
 */
export function suppressVerboseLogging() {
  if (process.env.NODE_ENV === 'production' && currentLevel !== 'debug') {
    const originalLog = console.log;
    const originalInfo = console.info;

    // In production, suppress console.log unless LOG_LEVEL=debug
    console.log = (...args: any[]) => {
      if (shouldLog('info')) {
        originalLog(...args);
      }
    };

    console.info = (...args: any[]) => {
      if (shouldLog('info')) {
        originalInfo(...args);
      }
    };

    // console.warn and console.error are always shown
    console.log('[LOGGER] Verbose logging suppressed in production (console.log disabled)');
  }
}

export default logger;
