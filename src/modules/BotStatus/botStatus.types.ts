export interface BotStatusRequest {
  host: string;
  user: string;
  password: string;
  logDir: string;
  tailLines?: number;
}

export interface BotStatusResponse {
  ok: true;
  logFile: string;
  lines: string[];
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
}

export interface BotStatusForm {
  host: string;
  user: string;
  logDir: string;
}
