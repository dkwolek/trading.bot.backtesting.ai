import { useMemo } from 'react';
import t from '../../../locales';
import { BOT_STATUS_VISIBLE_ACTIVITY } from '../botStatus.constants';
import { countEvents, findLatestSnapshot, parseLine } from '../botStatus.parser';
import { ParsedLogLine, RemoteState, SlotEntry } from '../botStatus.types';
import SnapshotCards from './SnapshotCards';
import CounterCards from './CounterCards';
import ActivityFeed from './ActivityFeed';
import SlotsList from './SlotsList';
import TotalsCards from './TotalsCards';

interface Props {
  lines: string[];
  logFile: string;
  logFileMtime: number | null;
  fetchedAt: number;
  state: RemoteState | null;
  stateError: string | null;
}

const STALE_LOG_THRESHOLD_MS = 90_000; // > 1.5x the bot's 60s tick interval = log is suspect

function formatAge(deltaMs: number): string {
  const seconds = Math.max(0, Math.floor(deltaMs / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

// State.slots is the live source of truth — convert into the same shape
// the legacy log-parsed slot list expects so SlotsList stays unchanged.
function slotsFromState(state: RemoteState): SlotEntry[] {
  return state.slots.map((slot) => ({
    state: slot.state === 'pending_buy' ? 'pending' : 'owned',
    price: slot.level,
  }));
}

export default function StatusPanel({
  lines,
  logFile,
  logFileMtime,
  fetchedAt,
  state,
  stateError,
}: Props) {
  const parsed = useMemo<ParsedLogLine[]>(() => lines.map(parseLine), [lines]);
  const snapshot = useMemo(() => findLatestSnapshot(parsed), [parsed]);
  const counters = useMemo(() => countEvents(parsed), [parsed]);
  const recent = useMemo(() => parsed.slice(-BOT_STATUS_VISIBLE_ACTIVITY).reverse(), [parsed]);
  const fetchedLabel = new Date(fetchedAt).toLocaleTimeString();
  const slotEntries = state ? slotsFromState(state) : snapshot.slots;
  const logAgeMs = logFileMtime !== null ? fetchedAt - logFileMtime : null;
  const isStale = logAgeMs !== null && logAgeMs > STALE_LOG_THRESHOLD_MS;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11px] font-mono text-muted">
        <span>
          {t.botStatus.lastUpdate}: <span className="text-text">{fetchedLabel}</span>
        </span>
        <span className="truncate" title={logFile}>
          {t.botStatus.logFile}: <span className="text-text">{logFile}</span>
        </span>
        {logAgeMs !== null && (
          <span>
            log age:{' '}
            <span className={isStale ? 'text-red' : 'text-text'}>{formatAge(logAgeMs)}</span>
            {isStale && <span className="text-red ml-1">(stale)</span>}
          </span>
        )}
      </div>
      {state ? (
        <TotalsCards state={state} />
      ) : (
        <div className="bg-surface border border-border p-3 text-[11px] font-mono text-muted">
          {t.botStatus.stateUnavailable}
          {stateError && <span className="text-red ml-2">({stateError})</span>}
        </div>
      )}
      <SnapshotCards snapshot={snapshot} />
      <SlotsList slots={slotEntries} />
      <CounterCards counters={counters} />
      <ActivityFeed lines={recent} />
    </div>
  );
}
