import t from '../../../locales';
import { SlotEntry } from '../botStatus.types';

interface Props {
  slots: SlotEntry[];
}

export default function SlotsList({ slots }: Props) {
  if (slots.length === 0) {
    return null;
  }
  const sorted = slots.slice().sort((first, second) => second.price - first.price);
  return (
    <div>
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1">
        {t.botStatus.slots}
      </span>
      <div className="bg-surface border border-border p-2 flex flex-wrap gap-1.5 min-w-0">
        {sorted.map((slot, index) => (
          <span
            key={`${slot.state}-${slot.price}-${index}`}
            className={`px-2 py-0.5 text-[11px] font-mono border ${
              slot.state === 'owned'
                ? 'bg-green/15 border-green/40 text-green'
                : 'bg-bg border-border text-muted'
            }`}
            title={slot.state === 'owned' ? t.botStatus.owned : t.botStatus.pending}
          >
            {slot.state === 'owned' ? 'O' : 'p'}
            {slot.price.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}
