import t from '../../../locales';
import { SnapshotState } from '../botStatus.types';

interface Props {
  snapshot: SnapshotState;
}

function formatNumber(value: number | null, fractionDigits: number): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function pnlClass(value: number | null): string {
  if (value === null) {
    return 'text-text';
  }
  if (value > 0) {
    return 'text-green';
  }
  if (value < 0) {
    return 'text-red';
  }
  return 'text-text';
}

export default function SnapshotCards({ snapshot }: Props) {
  return (
    <div>
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1">
        {t.botStatus.snapshot}
      </span>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <Card label={t.botStatus.price} value={`$${formatNumber(snapshot.price, 2)}`} />
        <Card label={t.botStatus.anchor} value={`$${formatNumber(snapshot.anchor, 2)}`} />
        <Card
          label={t.botStatus.realized}
          value={`$${formatNumber(snapshot.realized, 4)}`}
          valueClass={pnlClass(snapshot.realized)}
        />
        <Card label={t.botStatus.fees} value={`$${formatNumber(snapshot.fees, 4)}`} />
        <Card label={t.botStatus.cycles} value={formatNumber(snapshot.cycles, 0)} />
        <Card label={t.botStatus.slots} value={String(snapshot.slots.length)} />
      </div>
    </div>
  );
}

interface CardProps {
  label: string;
  value: string;
  valueClass?: string;
}

function Card({ label, value, valueClass = 'text-text' }: CardProps) {
  return (
    <div className="bg-surface border border-border p-3 flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted truncate">
        {label}
      </span>
      <span className={`font-mono text-[13px] font-medium truncate ${valueClass}`}>{value}</span>
    </div>
  );
}
