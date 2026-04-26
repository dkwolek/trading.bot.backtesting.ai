import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(DIR, 'config.json');

export interface BotConfig {
  pair: string; // Kraken pair altname, e.g. "ETHUSDC"
  amountPerLevel: number; // quote currency per buy
  stepPrice: number; // grid spacing in quote currency
  pendingBuys: number; // how many resting limit buys to maintain at any time
  maxTotalSlots: number; // combined owned + pending cap (prevents running out of quote capital)
  maxGridDepth: number; // how many steps below the anchor the grid may walk before stopping new buys
  pollIntervalMs: number; // how often to wake up and reconcile
}

const DEFAULT_CONFIG: BotConfig = {
  pair: 'ETHUSDC',
  amountPerLevel: 10,
  stepPrice: 25,
  pendingBuys: 2,
  maxTotalSlots: 10,
  maxGridDepth: 10,
  pollIntervalMs: 10_000,
};

export function loadConfig(): BotConfig {
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<BotConfig>;
  return {
    pair: parsed.pair ?? DEFAULT_CONFIG.pair,
    amountPerLevel: parsed.amountPerLevel ?? DEFAULT_CONFIG.amountPerLevel,
    stepPrice: parsed.stepPrice ?? DEFAULT_CONFIG.stepPrice,
    pendingBuys: parsed.pendingBuys ?? DEFAULT_CONFIG.pendingBuys,
    maxTotalSlots: parsed.maxTotalSlots ?? DEFAULT_CONFIG.maxTotalSlots,
    maxGridDepth: parsed.maxGridDepth ?? DEFAULT_CONFIG.maxGridDepth,
    pollIntervalMs: parsed.pollIntervalMs ?? DEFAULT_CONFIG.pollIntervalMs,
  };
}

export function validateConfig(config: BotConfig): void {
  if (config.amountPerLevel <= 0) {
    throw new Error('amountPerLevel must be > 0');
  }
  if (config.stepPrice <= 0) {
    throw new Error('stepPrice must be > 0');
  }
  if (config.pendingBuys < 1) {
    throw new Error('pendingBuys must be >= 1');
  }
  if (config.maxTotalSlots < config.pendingBuys) {
    throw new Error('maxTotalSlots must be >= pendingBuys');
  }
  if (config.maxGridDepth < 1) {
    throw new Error('maxGridDepth must be >= 1');
  }
  if (config.pollIntervalMs < 1000) {
    throw new Error('pollIntervalMs must be >= 1000');
  }
}
