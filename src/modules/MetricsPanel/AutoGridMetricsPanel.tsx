import { useMemo } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import {
  computeRequiredCapital,
  resolveAmountPerLevel,
  resolveCompounding,
  resolveStepPrice,
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
  const { algoOptions, candles, initialAmount } = useTradingContext();
  const stepPrice = resolveStepPrice(algoOptions);
  const amountPerLevel = resolveAmountPerLevel(algoOptions);
  const compounding = resolveCompounding(algoOptions);

  const requiredCapital = useMemo(
    () => computeRequiredCapital(candles, stepPrice, amountPerLevel),
    [candles, stepPrice, amountPerLevel]
  );

  const simulation = useMemo(
    () => simulateAutoGrid(candles, { stepPrice, amountPerLevel, compounding }),
    [candles, stepPrice, amountPerLevel, compounding]
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
    <div className="grid grid-cols-5 gap-2">
      <DualMetricCard
        primaryLabel="Net"
        primaryValue={formatPercent(simulation.netPnl, initialAmount)}
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
              {formatPercent(simulation.totalProfit, initialAmount)}
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
              {formatPercent(simulation.unrealizedPnl, initialAmount)}
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
        primaryValue={formatDollars(requiredCapital.capital)}
        secondaryLabel="Open"
        secondaryValue={formatDollars(simulation.openPositionsCost)}
        secondaryClass={simulation.openPositionsCost > 0 ? 'text-yellow-400' : 'text-text'}
      />
      <DualMetricCard
        primaryLabel="ROI / deployed"
        primaryValue={formatPercent(simulation.totalProfit, simulation.maxCapitalDeployed)}
        primaryClass={pnlClass(simulation.totalProfit)}
        secondaryLabel={`vs ${formatDollars(simulation.maxCapitalDeployed)} peak`}
        secondaryValue={formatDollarsSigned(simulation.totalProfit)}
        secondaryClass={pnlClass(simulation.totalProfit)}
      />
      <DualMetricCard
        primaryLabel="Cycles"
        primaryValue={String(simulation.completedCycles)}
        secondaryLabel="Open at end"
        secondaryValue={String(simulation.openPositionsAtEnd)}
        secondaryClass={simulation.openPositionsAtEnd > 0 ? 'text-yellow-400' : 'text-text'}
      />
    </div>
  );
}
