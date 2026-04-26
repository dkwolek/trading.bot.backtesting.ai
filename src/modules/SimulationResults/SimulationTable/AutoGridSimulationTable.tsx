import { useMemo, useState } from 'react';
import { AutoGridSimulationResult } from '../../../services/simulation';
import { useTradingContext } from '../../../context/TradingContext';

type SortKey = 'net' | 'realized' | 'cycles' | 'maxCapital';

interface Props {
  results: AutoGridSimulationResult[];
  onApply: (result: AutoGridSimulationResult) => void;
}

function sortResults(
  results: AutoGridSimulationResult[],
  key: SortKey
): AutoGridSimulationResult[] {
  return [...results].sort((a, b) => {
    if (key === 'realized') {
      return b.totalProfit - a.totalProfit;
    }
    if (key === 'cycles') {
      return b.cycles - a.cycles;
    }
    if (key === 'maxCapital') {
      return a.maxCapitalDeployed - b.maxCapitalDeployed;
    }
    return b.netPnl - a.netPnl;
  });
}

const TH =
  'text-left px-2 py-1 text-[9px] font-semibold tracking-widest uppercase text-muted whitespace-nowrap';

function formatPct(value: number, base: number): string {
  if (base <= 0) {
    return '—';
  }
  const pct = (value / base) * 100;
  const sign = pct >= 0 ? '+' : '-';
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

function formatDollars(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default function AutoGridSimulationTable({ results, onApply }: Props) {
  const { initialAmount } = useTradingContext();
  const [sortKey, setSortKey] = useState<SortKey>('net');
  const sorted = useMemo(() => sortResults(results, sortKey), [results, sortKey]);

  function sortableTh(key: SortKey, label: string) {
    const color = sortKey === key ? 'text-accent' : 'text-muted';
    return (
      <th
        className={`${TH} cursor-pointer hover:text-text ${color}`}
        onClick={() => setSortKey(key)}
      >
        {label}
      </th>
    );
  }

  return (
    <div className="border border-border overflow-y-auto max-h-64">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface border-b border-border sticky top-0 z-10">
            <th className={TH}>Step $</th>
            <th className={TH}>Amount $</th>
            {sortableTh('cycles', 'Cycles')}
            {sortableTh('realized', 'Realized')}
            {sortableTh('maxCapital', 'Max cap')}
            <th className={TH}>Open</th>
            <th className={TH}>Unrealized</th>
            {sortableTh('net', 'Net')}
            <th className="px-2 py-1" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((result, index) => {
            const realizedColor = result.totalProfit >= 0 ? 'text-green' : 'text-red';
            const netColor = result.netPnl >= 0 ? 'text-green' : 'text-red';
            const unrealizedColor = result.unrealizedPnl >= 0 ? 'text-green' : 'text-red';
            const rowBg = index % 2 === 0 ? '' : 'bg-surface';
            return (
              <tr
                key={result.stepPrice}
                className={`border-b border-border last:border-0 ${rowBg}`}
              >
                <td className="px-2 py-1 font-mono text-[10px] text-text">${result.stepPrice}</td>
                <td className="px-2 py-1 font-mono text-[10px] text-text">
                  ${result.amountPerLevel}
                </td>
                <td className="px-2 py-1 font-mono text-[10px] text-text">{result.cycles}</td>
                <td className={`px-2 py-1 font-mono text-[10px] ${realizedColor}`}>
                  {formatPct(result.totalProfit, initialAmount)}
                </td>
                <td className="px-2 py-1 font-mono text-[10px] text-text">
                  {formatDollars(result.maxCapitalDeployed)}
                </td>
                <td className="px-2 py-1 font-mono text-[10px] text-text">
                  {result.openPositionsAtEnd}
                </td>
                <td className={`px-2 py-1 font-mono text-[10px] ${unrealizedColor}`}>
                  {formatPct(result.unrealizedPnl, initialAmount)}
                </td>
                <td className={`px-2 py-1 font-mono text-[10px] ${netColor}`}>
                  {formatPct(result.netPnl, initialAmount)}
                </td>
                <td className="px-2 py-1">
                  <button
                    onClick={() => onApply(result)}
                    className="text-[9px] text-accent hover:text-text transition-colors"
                  >
                    Apply
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
