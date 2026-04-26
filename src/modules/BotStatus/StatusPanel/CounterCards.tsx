import t from '../../../locales';
import { LogCounters } from '../botStatus.types';

interface Props {
  counters: LogCounters;
}

export default function CounterCards({ counters }: Props) {
  const items: Array<{ label: string; value: number; tone: 'text' | 'green' | 'red' | 'yellow' }> =
    [
      { label: t.botStatus.fills, value: counters.fills, tone: 'green' },
      { label: t.botStatus.tps, value: counters.tps, tone: 'green' },
      { label: t.botStatus.shifts, value: counters.shifts, tone: 'text' },
      { label: t.botStatus.warnings, value: counters.warnings, tone: 'yellow' },
      { label: t.botStatus.errors, value: counters.errors, tone: 'red' },
    ];
  return (
    <div>
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1">
        {t.botStatus.counters}
      </span>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-surface border border-border p-3 flex flex-col gap-1 min-w-0"
          >
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted truncate">
              {item.label}
            </span>
            <span
              className={`font-mono text-[13px] font-medium truncate ${
                item.tone === 'green'
                  ? 'text-green'
                  : item.tone === 'red'
                    ? 'text-red'
                    : item.tone === 'yellow'
                      ? 'text-yellow-400'
                      : 'text-text'
              }`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
