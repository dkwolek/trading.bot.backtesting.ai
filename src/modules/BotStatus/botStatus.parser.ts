import { LogCounters, ParsedLogLine, SlotEntry, SnapshotState } from './botStatus.types';

const LINE_REGEX = /^\[([^\]]+)\] \[(INFO|OK|WARN|ERROR)\] (.*)$/;
const SUMMARY_REGEX =
  /^price ([-\d.]+) \| anchor ([-\d.]+|-) \| slots \[([^\]]*)\] \| realized \$([-\d.]+) \| fees \$([-\d.]+) \| cycles (\d+)/;

export function parseLine(raw: string): ParsedLogLine {
  const match = LINE_REGEX.exec(raw);
  if (!match) {
    return { raw, timestamp: null, level: null, message: raw };
  }
  const level = match[2] as ParsedLogLine['level'];
  return {
    raw,
    timestamp: match[1],
    level,
    message: match[3],
  };
}

function parseSlots(token: string): SlotEntry[] {
  const trimmed = token.trim();
  if (trimmed.length === 0 || trimmed === 'none') {
    return [];
  }
  return trimmed
    .split(/\s+/)
    .map((part): SlotEntry | null => {
      const head = part.charAt(0);
      const priceText = part.slice(1);
      const price = Number(priceText);
      if (!Number.isFinite(price)) {
        return null;
      }
      if (head === 'O') {
        return { state: 'owned', price };
      }
      if (head === 'p') {
        return { state: 'pending', price };
      }
      return null;
    })
    .filter((entry): entry is SlotEntry => entry !== null);
}

export function findLatestSnapshot(parsed: ParsedLogLine[]): SnapshotState {
  for (let index = parsed.length - 1; index >= 0; index--) {
    const line = parsed[index];
    if (line.level !== 'INFO') {
      continue;
    }
    const match = SUMMARY_REGEX.exec(line.message);
    if (!match) {
      continue;
    }
    const anchorRaw = match[2];
    return {
      price: Number(match[1]),
      anchor: anchorRaw === '-' ? null : Number(anchorRaw),
      slots: parseSlots(match[3]),
      realized: Number(match[4]),
      fees: Number(match[5]),
      cycles: Number(match[6]),
      capturedAt: line.timestamp,
    };
  }
  return {
    price: null,
    anchor: null,
    slots: [],
    realized: null,
    fees: null,
    cycles: null,
    capturedAt: null,
  };
}

export function countEvents(parsed: ParsedLogLine[]): LogCounters {
  const counters: LogCounters = { fills: 0, tps: 0, errors: 0, warnings: 0, shifts: 0 };
  for (const line of parsed) {
    if (line.level === 'ERROR') {
      counters.errors++;
      continue;
    }
    if (line.level === 'WARN') {
      counters.warnings++;
      continue;
    }
    if (line.level === 'OK') {
      if (line.message.startsWith('Placed limit buy')) {
        counters.fills++;
      } else if (
        line.message.startsWith('Placed TP') ||
        line.message.includes('Placed limit sell')
      ) {
        counters.tps++;
      }
      continue;
    }
    if (line.level === 'INFO' && line.message.startsWith('Grid shifted up')) {
      counters.shifts++;
    }
  }
  return counters;
}
