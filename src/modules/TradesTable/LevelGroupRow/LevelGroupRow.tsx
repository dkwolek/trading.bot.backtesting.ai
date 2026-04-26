import { LevelGroup, formatDollar, formatPrice } from '../tradesTable.utils';

interface Props {
  group: LevelGroup;
  expanded: boolean;
  onToggle: () => void;
  // When true, renders the row as the special "open positions" header
  // pinned to the top with the trade card's amber highlight.
  variant?: 'level' | 'open';
}

function pnlColor(value: number): string {
  return value >= 0 ? 'text-green' : 'text-red';
}

export default function LevelGroupRow({ group, expanded, onToggle, variant = 'level' }: Props) {
  const color = pnlColor(group.totalDollarPnl);
  const indicator = expanded ? '▾' : '▸';
  const isOpen = variant === 'open';
  const baseBg = isOpen
    ? 'bg-yellow-500/10 ring-1 ring-yellow-500/30 hover:bg-yellow-500/20'
    : 'bg-surface hover:bg-border/30';
  const labelColor = isOpen ? 'text-yellow-400' : 'text-text';
  const label = isOpen ? `OPEN (${group.openCount})` : `L${formatPrice(group.level)}`;
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-2 border-b border-border flex items-center justify-between gap-2 transition-colors w-full text-left ${baseBg}`}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-muted text-[10px] w-3">{indicator}</span>
        <span className={`font-mono text-[11px] ${labelColor}`}>{label}</span>
      </span>
      <span className="flex items-center gap-2 font-mono text-[10px]">
        {!isOpen && (
          <span className="text-muted">
            {group.closedCount}
            {group.openCount > 0 && <span className="text-yellow-400"> +{group.openCount}o</span>}
          </span>
        )}
        <span className={color}>{formatDollar(group.totalDollarPnl)}</span>
      </span>
    </button>
  );
}
