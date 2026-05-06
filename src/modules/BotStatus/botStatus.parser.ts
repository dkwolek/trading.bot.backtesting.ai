import { LogCounters, ParsedLogLine, SlotEntry, SnapshotState } from './botStatus.types';

const LINE_REGEX = /^\[([^\]]+)\] \[(INFO|OK|WARN|ERROR)\] (.*)$/;
const SUMMARY_REGEX =
  /^price ([-\d.]+) \| anchor ([-\d.]+|-) \| slots \[([^\]]*)\] \| realized \$([-\d.]+) \| fees \$([-\d.]+) \| cycles (\d+)/;
// Heartbeat — fires every N ticks regardless of dedup, so it's the most
// reliable source of "is the bot alive and what does it think" when the
// strategy has been idle (no fills/TPs to break the dedup).
const HEARTBEAT_REGEX =
  /^Heartbeat -- price ([-\d.]+) \| total [-\d.]+ \| free [-\d.]+ \| anchor ([-\d.]+|-) \| owned \d+ \| pending \d+ \| amount\/lvl \$[-\d.]+ \| realized \$([-\d.]+) \| fees \$([-\d.]+) \| cycles (\d+)/;

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
  // Walk newest -> oldest. Either summary or heartbeat produces a
  // snapshot; whichever is more recent wins. Summary carries explicit
  // slot positions (used only as a fallback when state.json is absent),
  // heartbeat doesn't — but both have price/anchor/realized/fees/cycles
  // and heartbeat is the more reliable signal when the strategy is idle.
  for (let index = parsed.length - 1; index >= 0; index--) {
    const line = parsed[index];
    if (line.level !== 'INFO') {
      continue;
    }
    const summary = SUMMARY_REGEX.exec(line.message);
    if (summary) {
      const anchorRaw = summary[2];
      return {
        price: Number(summary[1]),
        anchor: anchorRaw === '-' ? null : Number(anchorRaw),
        slots: parseSlots(summary[3]),
        realized: Number(summary[4]),
        fees: Number(summary[5]),
        cycles: Number(summary[6]),
        capturedAt: line.timestamp,
      };
    }
    const heartbeat = HEARTBEAT_REGEX.exec(line.message);
    if (heartbeat) {
      const anchorRaw = heartbeat[2];
      return {
        price: Number(heartbeat[1]),
        anchor: anchorRaw === '-' ? null : Number(anchorRaw),
        slots: [],
        realized: Number(heartbeat[3]),
        fees: Number(heartbeat[4]),
        cycles: Number(heartbeat[5]),
        capturedAt: line.timestamp,
      };
    }
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
  const counters: LogCounters = {
    fills: 0,
    tps: 0,
    errors: 0,
    warnings: 0,
    shifts: 0,
    deposits: 0,
    withdrawals: 0,
    heartbeats: 0,
    recomputes: 0,
  };
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
      // "Buy filled" is a real fill; "Placed limit buy" is just an
      // order placement (which often doesn't fill until much later).
      // The old counter conflated the two.
      if (line.message.startsWith('Buy filled')) {
        counters.fills++;
      } else if (line.message.startsWith('TP filled')) {
        counters.tps++;
      }
      continue;
    }
    if (line.level !== 'INFO') {
      continue;
    }
    if (
      line.message.startsWith('Grid shifted up') ||
      line.message.startsWith('Grid anchor moved')
    ) {
      counters.shifts++;
    } else if (line.message.startsWith('Detected deposit')) {
      counters.deposits++;
    } else if (line.message.startsWith('Detected withdrawal')) {
      counters.withdrawals++;
    } else if (line.message.startsWith('Heartbeat')) {
      counters.heartbeats++;
    } else if (line.message.includes('Recomputed amount/level')) {
      counters.recomputes++;
    }
  }
  return counters;
}
