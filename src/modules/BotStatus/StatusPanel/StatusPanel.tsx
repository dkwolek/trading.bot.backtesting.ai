import { useMemo } from 'react';
import t from '../../../locales';
import { BOT_STATUS_VISIBLE_ACTIVITY } from '../botStatus.constants';
import { countEvents, findLatestSnapshot, parseLine } from '../botStatus.parser';
import { ParsedLogLine } from '../botStatus.types';
import SnapshotCards from './SnapshotCards';
import CounterCards from './CounterCards';
import ActivityFeed from './ActivityFeed';
import SlotsList from './SlotsList';

interface Props {
  lines: string[];
  logFile: string;
  fetchedAt: number;
}

export default function StatusPanel({ lines, logFile, fetchedAt }: Props) {
  const parsed = useMemo<ParsedLogLine[]>(() => lines.map(parseLine), [lines]);
  const snapshot = useMemo(() => findLatestSnapshot(parsed), [parsed]);
  const counters = useMemo(() => countEvents(parsed), [parsed]);
  const recent = useMemo(() => parsed.slice(-BOT_STATUS_VISIBLE_ACTIVITY).reverse(), [parsed]);
  const fetchedLabel = new Date(fetchedAt).toLocaleTimeString();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11px] font-mono text-muted">
        <span>
          {t.botStatus.lastUpdate}: <span className="text-text">{fetchedLabel}</span>
        </span>
        <span className="truncate" title={logFile}>
          {t.botStatus.logFile}: <span className="text-text">{logFile}</span>
        </span>
      </div>
      <SnapshotCards snapshot={snapshot} />
      <SlotsList slots={snapshot.slots} />
      <CounterCards counters={counters} />
      <ActivityFeed lines={recent} />
    </div>
  );
}
