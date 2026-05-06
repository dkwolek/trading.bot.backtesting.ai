import t from '../../../locales';
import { RemoteState } from '../botStatus.types';

interface Props {
  state: RemoteState;
}

function formatDollars(value: number, fractionDigits = 2): string {
  const sign = value >= 0 ? '' : '-';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function pnlClass(value: number): string {
  if (value > 0) {
    return 'text-green';
  }
  if (value < 0) {
    return 'text-red';
  }
  return 'text-text';
}

// Quote currency the bot has cumulatively committed to entries —
// (cycles + currently-owned slots) × amountPerLevel. ROI uses this as
// the denominator so the % reflects "return on every dollar I've put
// into the grid", not "return on what's still locked right now".
// state.amountPerLevel is the live snapshot the bot itself uses for
// new placements; it's recomputed only on rebuild events (init /
// shift-up with empty bag / detected deposit). Falls back to peeking
// at an owned slot's cost when state pre-dates this field.
function resolveAmountPerLevel(state: RemoteState): number | null {
  if (state.amountPerLevel > 0) {
    return state.amountPerLevel;
  }
  const ownedWithCost = state.slots.find(
    (slot) => slot.state === 'owned' && slot.cost && slot.cost > 0
  );
  return ownedWithCost?.cost ?? null;
}

export default function TotalsCards({ state }: Props) {
  const amountPerLevel = resolveAmountPerLevel(state);
  const totalDeployedEver =
    amountPerLevel === null ? null : (state.cycles + state.slots.length) * amountPerLevel;
  const roi =
    totalDeployedEver !== null && totalDeployedEver > 0
      ? (state.totalRealized / totalDeployedEver) * 100
      : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <DualCard
        label={t.botStatus.totalRealized}
        primaryValue={roi === null ? '—' : formatPercent(roi)}
        primaryClass={roi === null ? 'text-text' : pnlClass(roi)}
        secondaryValue={formatDollars(state.totalRealized, 4)}
        secondaryClass={pnlClass(state.totalRealized)}
      />
      <Card
        label={t.botStatus.totalFees}
        value={formatDollars(state.totalFees, 4)}
        valueClass="text-yellow-400"
      />
      <Card label={t.botStatus.totalCycles} value={String(state.cycles)} />
      <Card
        label={t.botStatus.gridAnchor}
        value={state.gridAnchor === null ? '—' : `$${state.gridAnchor.toFixed(2)}`}
      />
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

interface DualCardProps {
  label: string;
  primaryValue: string;
  primaryClass?: string;
  secondaryValue: string;
  secondaryClass?: string;
}

function DualCard({
  label,
  primaryValue,
  primaryClass = 'text-text',
  secondaryValue,
  secondaryClass = 'text-text',
}: DualCardProps) {
  return (
    <div className="bg-surface border border-border p-3 flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted truncate">
        {label}
      </span>
      <span className={`font-mono text-[13px] font-medium truncate ${primaryClass}`}>
        {primaryValue}
      </span>
      <span className={`font-mono text-[10px] truncate ${secondaryClass}`}>{secondaryValue}</span>
    </div>
  );
}
