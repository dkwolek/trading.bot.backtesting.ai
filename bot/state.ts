import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(DIR, 'state.json');

export type SlotState = 'pending_buy' | 'owned';

export interface Slot {
  level: number; // grid level price this slot is anchored to
  state: SlotState;
  buyTxid: string; // Kraken txid for the entry limit buy
  sellTxid?: string; // Kraken txid for the TP limit sell (once state === 'owned')
  buyFillPrice?: number; // actual fill price once the buy closes
  volume?: number; // base-currency volume (from buy fill)
  cost?: number; // quote spent on entry incl. buy-side fee
  openedAt: number; // unix ms when the buy limit was placed
  ownedAt?: number; // unix ms when the buy filled
}

export interface BotState {
  slots: Slot[];
  gridAnchor: number | null; // top pending level at the moment the grid was initialised
  totalRealized: number;
  totalFees: number;
  cycles: number;
}

const EMPTY_STATE: BotState = {
  slots: [],
  gridAnchor: null,
  totalRealized: 0,
  totalFees: 0,
  cycles: 0,
};

export function loadState(): BotState {
  if (!existsSync(STATE_PATH)) {
    return { ...EMPTY_STATE, slots: [] };
  }
  try {
    const raw = readFileSync(STATE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BotState>;
    return {
      slots: Array.isArray(parsed.slots) ? parsed.slots : [],
      gridAnchor: typeof parsed.gridAnchor === 'number' ? parsed.gridAnchor : null,
      totalRealized: parsed.totalRealized ?? 0,
      totalFees: parsed.totalFees ?? 0,
      cycles: parsed.cycles ?? 0,
    };
  } catch {
    return { ...EMPTY_STATE, slots: [] };
  }
}

export function saveState(state: BotState): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}
