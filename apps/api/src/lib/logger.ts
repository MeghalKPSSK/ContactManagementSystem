import fs from 'fs';
import path from 'path';
import util from 'util';
import { Writable } from 'stream';
import pino from 'pino';
import pinoHttp from 'pino-http';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const LOG_RETENTION_DAYS = 30;
const LOG_DIR = path.resolve(__dirname, '../../logs');
const LOG_FILE_PREFIX = 'api';

interface RotationState {
  slotStart: number;
  filePath: string;
  stream: fs.WriteStream;
}

const ensureLogDir = (): void => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
};

const getSlotStart = (timestampMs: number): number => Math.floor(timestampMs / FOUR_HOURS_MS) * FOUR_HOURS_MS;

const buildFileName = (slotStart: number): string => {
  const date = new Date(slotStart);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `${LOG_FILE_PREFIX}-${year}${month}${day}-${hour}00Z.log`;
};

const openSlotStream = (slotStart: number): RotationState => {
  ensureLogDir();
  const filePath = path.join(LOG_DIR, buildFileName(slotStart));
  const stream = fs.createWriteStream(filePath, { flags: 'a' });
  return { slotStart, filePath, stream };
};

let rotationState = openSlotStream(getSlotStart(Date.now()));

const rotateIfNeeded = (): void => {
  const nextSlotStart = getSlotStart(Date.now());
  if (nextSlotStart === rotationState.slotStart) return;

  const previous = rotationState;
  rotationState = openSlotStream(nextSlotStart);
  previous.stream.end();
};

const cleanupOldLogs = (): void => {
  const cutoff = Date.now() - (LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  ensureLogDir();

  for (const fileName of fs.readdirSync(LOG_DIR)) {
    if (!fileName.endsWith('.log') || !fileName.startsWith(`${LOG_FILE_PREFIX}-`)) continue;
    const filePath = path.join(LOG_DIR, fileName);

    try {
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoff) {
        fs.rmSync(filePath, { force: true });
      }
    } catch {
      // Continue cleanup for remaining files.
    }
  }
};

const rotatingFileStream = new Writable({
  write(chunk, encoding, callback) {
    try {
      rotateIfNeeded();
      if (!rotationState.stream.write(chunk, encoding)) {
        rotationState.stream.once('drain', callback);
      } else {
        callback();
      }
    } catch (error) {
      process.stderr.write(`Logger stream error: ${error instanceof Error ? error.message : String(error)}\n`);
      callback();
    }
  },
});

const rotationTimer = setInterval(() => {
  rotateIfNeeded();
  cleanupOldLogs();
}, 60 * 1000);
rotationTimer.unref();
cleanupOldLogs();

const redactPaths = [
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'body.password',
  'body.confirmPassword',
  'body.currentPassword',
  'body.newPassword',
  'req.body.password',
  'req.body.confirmPassword',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.headers.authorization',
];

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'debug',
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
      remove: false,
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
  },
  pino.multistream([
    { stream: process.stdout },
    { stream: rotatingFileStream },
  ])
);

export const httpLogger = pinoHttp({
  logger,
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res, error) => `${req.method} ${req.url} failed: ${error.message} (${res.statusCode})`,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  customProps: (req) => {
    const expressReq = req as unknown as {
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
      body?: unknown;
    };

    return {
      routeParams: expressReq.params,
      queryParams: expressReq.query,
      requestBody: expressReq.body,
    };
  },
});

const inspectArgs = (args: unknown[]): string => args
  .map((entry) => {
    if (typeof entry === 'string') return entry;
    if (entry instanceof Error) {
      return util.inspect({ name: entry.name, message: entry.message, stack: entry.stack }, { depth: 6, colors: false });
    }
    return util.inspect(entry, { depth: 6, colors: false });
  })
  .join(' ');

/* eslint-disable no-console */
console.log = (...args: unknown[]): void => logger.info({ args }, inspectArgs(args));
console.info = (...args: unknown[]): void => logger.info({ args }, inspectArgs(args));
console.warn = (...args: unknown[]): void => logger.warn({ args }, inspectArgs(args));
console.error = (...args: unknown[]): void => logger.error({ args }, inspectArgs(args));
console.debug = (...args: unknown[]): void => logger.debug({ args }, inspectArgs(args));
/* eslint-enable no-console */
