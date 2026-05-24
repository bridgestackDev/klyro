import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const level = process.env.LOG_LEVEL ?? (isDev ? "debug" : "info");
const pretty =
  process.env.LOG_PRETTY === "true" ||
  (isDev && process.env.LOG_PRETTY !== "false");

const _pino = pino({
  level,
  ...(pretty && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
    },
  }),
});

/**
 * Attempts to add a Sentry breadcrumb. No-ops gracefully when @sentry/nextjs
 * is not installed. Once the SDK is configured, breadcrumbs flow automatically.
 */
function trySentryCrumb(level: string, msg: string, data?: object) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require(/* webpackIgnore: true */ "@sentry/nextjs") as {
      addBreadcrumb: (b: {
        level: string;
        message: string;
        data?: object;
        timestamp: number;
      }) => void;
    };
    Sentry.addBreadcrumb({ level, message: msg, data, timestamp: Date.now() / 1000 });
  } catch {
    // Sentry SDK not installed or not initialized — no-op
  }
}

export type LogData = Record<string, unknown>;

/**
 * Server-only structured logger. Never import this in "use client" components.
 * Call convention: logger.info("message", { context })
 */
export const logger = {
  debug(msg: string, data?: LogData) {
    _pino.debug(data ?? {}, msg);
  },
  info(msg: string, data?: LogData) {
    _pino.info(data ?? {}, msg);
  },
  warn(msg: string, data?: LogData) {
    _pino.warn(data ?? {}, msg);
    trySentryCrumb("warning", msg, data);
  },
  error(msg: string, data?: LogData) {
    _pino.error(data ?? {}, msg);
    trySentryCrumb("error", msg, data);
  },
};

/**
 * Returns a child logger pre-bound with a request ID and route path.
 * Use at the top of route handlers: const log = getRequestLogger(req, "/api/bookings");
 */
export function getRequestLogger(reqId: string, route: string) {
  const child = _pino.child({ reqId, route });
  return {
    debug(msg: string, data?: LogData) { child.debug(data ?? {}, msg); },
    info(msg: string, data?: LogData)  { child.info(data ?? {}, msg); },
    warn(msg: string, data?: LogData)  { child.warn(data ?? {}, msg);  trySentryCrumb("warning", msg, data); },
    error(msg: string, data?: LogData) { child.error(data ?? {}, msg); trySentryCrumb("error", msg, data); },
  };
}
