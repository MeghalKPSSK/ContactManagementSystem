"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLogger = exports.logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const stream_1 = require("stream");
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const LOG_RETENTION_DAYS = 30;
const LOG_DIR = path_1.default.resolve(__dirname, '../../logs');
const LOG_FILE_PREFIX = 'api';
const ensureLogDir = () => {
    if (!fs_1.default.existsSync(LOG_DIR)) {
        fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
    }
};
const getSlotStart = (timestampMs) => Math.floor(timestampMs / FOUR_HOURS_MS) * FOUR_HOURS_MS;
const buildFileName = (slotStart) => {
    const date = new Date(slotStart);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return `${LOG_FILE_PREFIX}-${year}${month}${day}-${hour}00Z.log`;
};
const openSlotStream = (slotStart) => {
    ensureLogDir();
    const filePath = path_1.default.join(LOG_DIR, buildFileName(slotStart));
    const stream = fs_1.default.createWriteStream(filePath, { flags: 'a' });
    return { slotStart, filePath, stream };
};
let rotationState = openSlotStream(getSlotStart(Date.now()));
const rotateIfNeeded = () => {
    const nextSlotStart = getSlotStart(Date.now());
    if (nextSlotStart === rotationState.slotStart)
        return;
    const previous = rotationState;
    rotationState = openSlotStream(nextSlotStart);
    previous.stream.end();
};
const cleanupOldLogs = () => {
    const cutoff = Date.now() - (LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    ensureLogDir();
    for (const fileName of fs_1.default.readdirSync(LOG_DIR)) {
        if (!fileName.endsWith('.log') || !fileName.startsWith(`${LOG_FILE_PREFIX}-`))
            continue;
        const filePath = path_1.default.join(LOG_DIR, fileName);
        try {
            const stat = fs_1.default.statSync(filePath);
            if (stat.mtimeMs < cutoff) {
                fs_1.default.rmSync(filePath, { force: true });
            }
        }
        catch {
            // Continue cleanup for remaining files.
        }
    }
};
const rotatingFileStream = new stream_1.Writable({
    write(chunk, encoding, callback) {
        try {
            rotateIfNeeded();
            if (!rotationState.stream.write(chunk, encoding)) {
                rotationState.stream.once('drain', callback);
            }
            else {
                callback();
            }
        }
        catch (error) {
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
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'debug',
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    redact: {
        paths: redactPaths,
        censor: '[REDACTED]',
        remove: false,
    },
    formatters: {
        level: (label) => ({ level: label }),
    },
}, pino_1.default.multistream([
    { stream: process.stdout },
    { stream: rotatingFileStream },
]));
exports.httpLogger = (0, pino_http_1.default)({
    logger: exports.logger,
    customLogLevel(_req, res, err) {
        if (err || res.statusCode >= 500)
            return 'error';
        if (res.statusCode >= 400)
            return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
    customErrorMessage: (req, res, error) => `${req.method} ${req.url} failed: ${error.message} (${res.statusCode})`,
    serializers: {
        err: pino_1.default.stdSerializers.err,
        req: pino_1.default.stdSerializers.req,
        res: pino_1.default.stdSerializers.res,
    },
    customProps: (req) => {
        const expressReq = req;
        return {
            routeParams: expressReq.params,
            queryParams: expressReq.query,
            requestBody: expressReq.body,
        };
    },
});
const inspectArgs = (args) => args
    .map((entry) => {
    if (typeof entry === 'string')
        return entry;
    if (entry instanceof Error) {
        return util_1.default.inspect({ name: entry.name, message: entry.message, stack: entry.stack }, { depth: 6, colors: false });
    }
    return util_1.default.inspect(entry, { depth: 6, colors: false });
})
    .join(' ');
/* eslint-disable no-console */
console.log = (...args) => exports.logger.info({ args }, inspectArgs(args));
console.info = (...args) => exports.logger.info({ args }, inspectArgs(args));
console.warn = (...args) => exports.logger.warn({ args }, inspectArgs(args));
console.error = (...args) => exports.logger.error({ args }, inspectArgs(args));
console.debug = (...args) => exports.logger.debug({ args }, inspectArgs(args));
/* eslint-enable no-console */
//# sourceMappingURL=logger.js.map