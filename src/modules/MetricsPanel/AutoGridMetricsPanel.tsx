import { useMemo } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import {
  resolveAmountPerLevel,
  resolveAtrMultiplier,
  resolveAtrPeriod,
  resolveChaseAfterTp,
  resolveCompounding,
  resolveStepPrice,
  resolveTrendEmaPeriod,
  resolveTrendFilter,
  resolveTrendRangeBandPct,
  resolveVolAdaptiveStep,
  simulateAutoGrid,
} from '../../algos/auto-grid.algo';

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
  negative?: boolean;
  warning?: boolean;
}

function MetricCard({ label, value, hint, positive, negative, warning }: MetricCardProps) {
  let valueColor = 'text-text';
  if (positive) {
    valueColor = 'text-green';
  } else if (negative) {
    valueColor = 'text-red';
  } else if (warning) {
    valueColor = 'text-yellow-400';
  }

  return (
    <div className="bg-surface border border-border p-3 flex flex-col justify-between gap-1 min-w-0">
      <span
        className="text-[10px] font-semibold tracking-widest uppercase text-muted truncate"
        title={label}
      >
        {label}
      </span>
      <span className={`font-mono text-[13px] font-medium truncate ${valueColor}`}>{value}</span>
      {hint && (
        <span className="text-[9px] text-muted truncate" title={hint}>
          {hint}
        </span>
      )}
    </div>
  );
}

interface DualMetricCardProps {
  primaryLabel: string;
  primaryValue: string;
  primaryClass?: string;
  secondaryLabel: string;
  secondaryValue: string;
  secondaryClass?: string;
}

function DualMetricCard({
  primaryLabel,
  primaryValue,
  primaryClass = 'text-text',
  secondaryLabel,
  secondaryValue,
  secondaryClass = 'text-text',
}: DualMetricCardProps) {
  return (
    <div className="bg-surface border border-border p-3 flex flex-col gap-2 min-w-0">
      <div className="flex flex-col min-w-0">
        <span
          className="text-[10px] font-semibold tracking-widest uppercase text-muted truncate"
          title={primaryLabel}
        >
          {primaryLabel}
        </span>
        <span className={`font-mono text-[13px] font-medium truncate ${primaryClass}`}>
          {primaryValue}
        </span>
      </div>
      <div className="flex flex-col min-w-0">
        <span
          className="text-[9px] tracking-widest uppercase text-muted truncate"
          title={secondaryLabel}
        >
          {secondaryLabel}
        </span>
        <span className={`font-mono text-[11px] truncate ${secondaryClass}`}>{secondaryValue}</span>
      </div>
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
  const { algoOptions, candles } = useTradingContext();
  const stepPrice = resolveStepPrice(algoOptions);
  const amountPerLevel = resolveAmountPerLevel(algoOptions);
  const compounding = resolveCompounding(algoOptions);
  const trendFilter = resolveTrendFilter(algoOptions);
  const trendEmaPeriod = resolveTrendEmaPeriod(algoOptions);
  const trendRangeBandPct = resolveTrendRangeBandPct(algoOptions);
  const volAdaptiveStep = resolveVolAdaptiveStep(algoOptions);
  const atrPeriod = resolveAtrPeriod(algoOptions);
  const atrMultiplier = resolveAtrMultiplier(algoOptions);
  const chaseAfterTp = resolveChaseAfterTp(algoOptions);

  const simulation = useMemo(
    () =>
      simulateAutoGrid(candles, {
        stepPrice,
        amountPerLevel,
        compounding,
        trendFilter,
        trendEmaPeriod,
        trendRangeBandPct,
        volAdaptiveStep,
        atrPeriod,
        atrMultiplier,
        chaseAfterTp,
      }),
    [
      candles,
      stepPrice,
      amountPerLevel,
      compounding,
      trendFilter,
      trendEmaPeriod,
      trendRangeBandPct,
      volAdaptiveStep,
      atrPeriod,
      atrMultiplier,
      chaseAfterTp,
    ]
  );

  if (candles.length === 0) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-surface border border-border p-3 flex flex-col gap-1">
            <div className="h-3 w-16 bg-border rounded animate-pulse" />
            <div className="h-4 w-12 bg-border rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      <DualMetricCard
        primaryLabel="Net"
        primaryValue={formatPercent(simulation.netPnl, simulation.requiredCapitalActual)}
        primaryClass={pnlClass(simulation.netPnl)}
        secondaryLabel="Net $"
        secondaryValue={`${simulation.netPnl >= 0 ? '+' : '-'}$${Math.abs(simulation.netPnl).toFixed(2)}`}
        secondaryClass={pnlClass(simulation.netPnl)}
      />
      <div className="bg-surface border border-border p-3 flex flex-col gap-2 min-w-0">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted truncate">
            Realized
          </span>
          <div className="flex items-baseline gap-2 min-w-0">
            <span
              className={`font-mono text-[13px] font-medium truncate ${pnlClass(simulation.totalProfit)}`}
            >
              {formatPercent(simulation.totalProfit, simulation.requiredCapitalActual)}
            </span>
            <span className={`font-mono text-[11px] truncate ${pnlClass(simulation.totalProfit)}`}>
              {formatDollarsSigned(simulation.totalProfit)}
            </span>
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] tracking-widest uppercase text-muted truncate">
            Unrealized
          </span>
          <div className="flex items-baseline gap-2 min-w-0">
            <span
              className={`font-mono text-[11px] font-medium truncate ${pnlClass(simulation.unrealizedPnl)}`}
            >
              {formatPercent(simulation.unrealizedPnl, simulation.requiredCapitalActual)}
            </span>
            <span
              className={`font-mono text-[10px] truncate ${pnlClass(simulation.unrealizedPnl)}`}
            >
              {formatDollarsSigned(simulation.unrealizedPnl)}
            </span>
          </div>
        </div>
      </div>
      <DualMetricCard
        primaryLabel="Required capital"
        primaryValue={formatDollars(simulation.requiredCapitalActual)}
        secondaryLabel={
          volAdaptiveStep
            ? `step $${simulation.effectiveStepPrice.toFixed(2)} · ${simulation.uniqueLevelsTraded} levels`
            : `${simulation.uniqueLevelsTraded} levels traded`
        }
        secondaryValue={`Open ${formatDollars(simulation.openPositionsCost)}`}
        secondaryClass={simulation.openPositionsCost > 0 ? 'text-yellow-400' : 'text-text'}
      />
      <DualMetricCard
        primaryLabel="Cycles"
        primaryValue={String(simulation.completedCycles)}
        secondaryLabel={trendFilter ? 'Blocked' : 'Open at end'}
        secondaryValue={
          trendFilter
            ? `${simulation.trendBlockedFills} / ${simulation.openPositionsAtEnd} open`
            : String(simulation.openPositionsAtEnd)
        }
        secondaryClass={
          trendFilter
            ? simulation.trendBlockedFills > 0
              ? 'text-purple-400'
              : 'text-text'
            : simulation.openPositionsAtEnd > 0
              ? 'text-yellow-400'
              : 'text-text'
        }
      />
    </div>
  );
}
