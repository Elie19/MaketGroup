const IS_PROD = process.env.NODE_ENV === 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const redact = (data: any): any => {
  if (!data) return data;
  if (typeof data !== 'object') return data;

  const sensitiveKeys = ['email', 'password', 'token', 'apiKey', 'secret', 'phone'];
  const redacted = Array.isArray(data) ? [...data] : { ...data };

  for (const key in redacted) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redact(redacted[key]);
    }
  }

  return redacted;
};

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (!IS_PROD) {
      console.debug(`[DEBUG] ${message}`, ...args.map(redact));
    }
  },
  info: (message: string, ...args: any[]) => {
    console.info(`[INFO] ${message}`, ...args.map(redact));
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args.map(redact));
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args.map(redact));
  }
};
