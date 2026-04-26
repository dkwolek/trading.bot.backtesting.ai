import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(DIR, 'logs');
mkdirSync(LOG_DIR, { recursive: true });

function getLogFile(): string {
  const date = formatDate(new Date());
  return join(LOG_DIR, `bot-${date}.log`);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
}

function formatTimestamp(): string {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function write(level: string, message: string) {
  const line = `[${formatTimestamp()}] [${level}] ${message}\n`;
  process.stdout.write(line);
  appendFileSync(getLogFile(), line);
}

export function info(message: string) {
  write('INFO', message);
}

export function success(message: string) {
  write('OK', message);
}

export function error(message: string) {
  write('ERROR', message);
}

export function warn(message: string) {
  write('WARN', message);
}
