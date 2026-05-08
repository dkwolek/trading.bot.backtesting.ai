import { useMemo } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import {
  resolveAmountPerLevel,
  resolveDcaAllocationPct,
  resolveMonthlyAmount,
  resolveMonthlyMode,
  resolveMonthlyRangePct,
  resolveStepPrice,
  resolveWeightedSizing,
  simulateAutoGrid,
} from '../../algos/auto-grid.algo';
import { simulateDCA } from '../../algos/dca.algo';

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
  const monthlyMode = resolveMonthlyMode(algoOptions);
  const monthlyAmount = resolveMonthlyAmount(algoOptions);
  const monthlyRangePct = resolveMonthlyRangePct(algoOptions);
  const dcaAllocationPct = resolveDcaAllocationPct(algoOptions);
  const weightedSizing = resolveWeightedSizing(algoOptions);

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
        weightedSizing,
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
      weightedSizing,
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

  const requiredCapital = simulation.requiredCapitalActual;
  const requiredLabel = monthlyMode
    ? `monthly · ${simulation.monthlyResets} resets`
    : `peak concurrent · ${simulation.uniqueLevelsTraded} unique levels`;
  const hybridActive = monthlyMode && dcaAllocationPct > 0;
  const showColumns = hybridActive ? 'grid-cols-7' : 'grid-cols-6';
  const deploymentPct = simulation.avgDeploymentPct;
  // Visual cue: >70% means the grid is consuming most of what gets
  // deposited; <40% flags wasted budget that's just sitting idle and
  // dragging Net % down. The user can use this to size monthlyAmount.
  let deploymentClass = 'text-text';
  if (deploymentPct >= 70) {
    deploymentClass = 'text-green';
  } else if (deploymentPct < 40) {
    deploymentClass = 'text-yellow-400';
  }
  const deploymentHint =
    deploymentPct >= 70 ? 'capital working' : deploymentPct >= 40 ? 'partial use' : 'mostly idle';

  return (
    <div className={`grid ${showColumns} gap-2`}>
      <DualMetricCard
        primaryLabel="Net"
        primaryValue={formatPercent(simulation.netPnl, requiredCapital)}
        primaryClass={pnlClass(simulation.netPnl)}
        secondaryLabel="Grid only $"
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
              {formatPercent(simulation.totalProfit, requiredCapital)}
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
              {formatPercent(simulation.unrealizedPnl, requiredCapital)}
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
        primaryValue={formatDollars(requiredCapital)}
        secondaryLabel={requiredLabel}
        secondaryValue={`Open ${formatDollars(simulation.openPositionsCost)}`}
        secondaryClass={simulation.openPositionsCost > 0 ? 'text-yellow-400' : 'text-text'}
      />
      <DualMetricCard
        primaryLabel="Deployment"
        primaryValue={`${deploymentPct.toFixed(1)}%`}
        primaryClass={deploymentClass}
        secondaryLabel={deploymentHint}
        secondaryValue={`peak ${formatDollars(simulation.maxCapitalDeployed)}`}
      />
      <DualMetricCard
        primaryLabel="Cycles"
        primaryValue={String(simulation.completedCycles)}
        secondaryLabel="Open at end"
        secondaryValue={String(simulation.openPositionsAtEnd)}
        secondaryClass={simulation.openPositionsAtEnd > 0 ? 'text-yellow-400' : 'text-text'}
      />
      <DualMetricCard
        primaryLabel="DCA baseline"
        primaryValue={`${dca.netPct >= 0 ? '+' : '-'}${Math.abs(dca.netPct).toFixed(2)}%`}
        primaryClass={pnlClass(dca.netPnl)}
        secondaryLabel="vs hodl-by-DCA"
        secondaryValue={formatDollarsSigned(dca.netPnl)}
        secondaryClass={pnlClass(dca.netPnl)}
      />
      {hybridActive && (
        <DualMetricCard
          primaryLabel="Hybrid total"
          primaryValue={formatPercent(simulation.hybridNetPnl, requiredCapital)}
          primaryClass={pnlClass(simulation.hybridNetPnl)}
          secondaryLabel={`grid + dca · ${dcaAllocationPct}%`}
          secondaryValue={formatDollarsSigned(simulation.hybridNetPnl)}
          secondaryClass={pnlClass(simulation.hybridNetPnl)}
        />
      )}
    </div>
  );
}
