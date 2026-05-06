export interface BotStatusRequest {
  host: string;
  user: string;
  password: string;
  logDir: string;
  tailLines?: number;
}

export interface RemoteSlot {
  level: number;
  state: 'pending_buy' | 'owned';
  buyTxid?: string;
  sellTxid?: string;
  buyFillPrice?: number;
  volume?: number;
  cost?: number;
  openedAt?: number;
  ownedAt?: number;
}

export interface RemoteState {
  slots: RemoteSlot[];
  gridAnchor: number | null;
  amountPerLevel: number;
  lastTotalQuote: number;
  makerFee: number;
  totalRealized: number;
  totalFees: number;
  cycles: number;
}

export interface RemoteConfig {
  pair: string | null;
  stepPrice: number | null;
  gridRangePct: number | null;
  pendingBuys: number | null;
  pollIntervalMs: number | null;
}

export interface BotStatusResponse {
  ok: true;
  logFile: string;
  logFileMtime: number | null;
  lines: string[];
  state: RemoteState | null;
  stateError: string | null;
  config: RemoteConfig | null;
  configError: string | null;
  fetchedAt: number;
}

export interface BotStatusError {
  ok: false;
  error: string;
}

export type BotStatusResult = BotStatusResponse | BotStatusError;

export interface ParsedLogLine {
  raw: string;
  timestamp: string | null;
  level: 'INFO' | 'OK' | 'WARN' | 'ERROR' | null;
  message: string;
}

export interface SlotEntry {
  state: 'owned' | 'pending';
  price: number;
}

export interface SnapshotState {
  price: number | null;
  anchor: number | null;
  slots: SlotEntry[];
  realized: number | null;
  fees: number | null;
  cycles: number | null;
  capturedAt: string | null;
}

export interface LogCounters {
  fills: number;
  tps: number;
  errors: number;
  warnings: number;
  shifts: number;
  deposits: number;
  withdrawals: number;
  heartbeats: number;
  recomputes: number;
}

export interface BotStatusForm {
  host: string;
  user: string;
  logDir: string;
}
