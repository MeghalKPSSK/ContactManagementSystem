import fs from 'fs';
import path from 'path';

// Sets up file-backed logging and redirects console.* to it; must run before other modules log.
const logFilePath = path.join(__dirname, '../app.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

const logMessage = (message: string, level = 'INFO'): void => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const formattedMessage = `[${level} - ${timestamp}]: ${message}\n`;
  logStream.write(formattedMessage);
  process.stdout.write(formattedMessage);
};

/* eslint-disable no-console */
console.log = (...args: unknown[]): void => logMessage(args.join(' '), 'LOG');
console.error = (...args: unknown[]): void => logMessage(args.join(' '), 'ERROR');
console.warn = (...args: unknown[]): void => logMessage(args.join(' '), 'WARNING');
/* eslint-enable no-console */
