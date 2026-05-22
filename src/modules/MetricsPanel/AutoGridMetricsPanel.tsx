import { useMemo } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import {
  resolveAmountPerLevel,
  resolveDcaAllocationPct,
  resolveMonthlyAmount,
  resolveMonthlyMode,
  resolveMonthlyRangePct,
  resolveStepPrice,
  simulateAutoGrid,
} from '../../algos/auto-grid.algo';
import { simulateDCA } from '../../algos/dca.algo';

interface MetricRowProps {
  label: string;
  value: string;
  valueClass?: string;
}

function MetricRow({ label, value, valueClass = 'text-text' }: MetricRowProps) {
  return (
    <div className="flex justify-between items-baseline gap-2 py-0.5 border-b border-border/40 last:border-0">
      <span className="text-[9px] font-semibold tracking-widest uppercase text-muted shrink-0">
        {label}
      </span>
      <span className={`font-mono text-[10px] font-medium truncate ${valueClass}`}>{value}</span>
    </div>
  );
}

function formatPercent(value: number, base: number): string {
  if (base <= 0) {
    return '—';
  }
  const pct = (value / base) * 100;
  const sign = pct >= 0 ? '+' : '-';
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

function formatDollars(value: number): string {
  const sign = value >= 0 ? '' : '-';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function formatDollarsSigned(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
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

export default function AutoGridMetricsPanel() {
  const { algoOptions, candles, initialAmount } = useTradingContext();
  const stepPrice = resolveStepPrice(algoOptions);
  const amountPerLevel = resolveAmountPerLevel(algoOptions);
  const monthlyMode = resolveMonthlyMode(algoOptions);
  const monthlyAmount = resolveMonthlyAmount(algoOptions);
  const monthlyRangePct = resolveMonthlyRangePct(algoOptions);
  const dcaAllocationPct = resolveDcaAllocationPct(algoOptions);

  const dca = useMemo(
    () => simulateDCA(candles, initialAmount, monthlyMode ? monthlyAmount : 0),
    [candles, initialAmount, monthlyMode, monthlyAmount]
  );

  const simulation = useMemo(
    () =>
      simulateAutoGrid(candles, {
        stepPrice,
        amountPerLevel,
        initialAmount,
        monthlyMode,
        monthlyAmount,
        monthlyRangePct,
        dcaAllocationPct,
      }),
    [
      candles,
      stepPrice,
      amountPerLevel,
      initialAmount,
      monthlyMode,
      monthlyAmount,
      monthlyRangePct,
      dcaAllocationPct,
    ]
  );

  if (candles.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex justify-between py-0.5">
            <div className="h-2 w-14 bg-border rounded animate-pulse" />
            <div className="h-2 w-12 bg-border rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const requiredCapital = simulation.requiredCapitalActual;
  const hybridActive = monthlyMode && dcaAllocationPct > 0;

  return (
    <div className="flex flex-col">
      <MetricRow
        label="Net"
        value={`${formatPercent(simulation.netPnl, requiredCapital)}  ${formatDollarsSigned(simulation.netPnl)}`}
        valueClass={pnlClass(simulation.netPnl)}
      />
      <MetricRow
        label="Realized"
        value={`${formatPercent(simulation.totalProfit, requiredCapital)}  ${formatDollarsSigned(simulation.totalProfit)}`}
        valueClass={pnlClass(simulation.totalProfit)}
      />
      <MetricRow
        label="Unrealized"
        value={`${formatPercent(simulation.unrealizedPnl, requiredCapital)}  ${formatDollarsSigned(simulation.unrealizedPnl)}`}
        valueClass={pnlClass(simulation.unrealizedPnl)}
      />
      <MetricRow label="Required" value={formatDollars(requiredCapital)} />
      <MetricRow
        label="Cycles"
        value={`${simulation.completedCycles}  open: ${simulation.openPositionsAtEnd}`}
        valueClass={simulation.openPositionsAtEnd > 0 ? 'text-yellow-400' : 'text-text'}
      />
      <MetricRow
        label="Free cash"
        value={`${formatDollars(simulation.finalFreeCash)}  ${((simulation.finalFreeCash / simulation.totalDeposited) * 100).toFixed(1)}%`}
      />
      <MetricRow
        label="DCA baseline"
        value={`${dca.netPct >= 0 ? '+' : '-'}${Math.abs(dca.netPct).toFixed(2)}%  ${formatDollarsSigned(dca.netPnl)}`}
        valueClass={pnlClass(dca.netPnl)}
      />
      {hybridActive && (
        <MetricRow
          label="Hybrid"
          value={`${formatPercent(simulation.hybridNetPnl, requiredCapital)}  ${formatDollarsSigned(simulation.hybridNetPnl)}`}
          valueClass={pnlClass(simulation.hybridNetPnl)}
        />
      )}
    </div>
  );
}
