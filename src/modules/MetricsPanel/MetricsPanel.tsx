import { BacktestMetrics } from '../../types/algo.types';
import t from '../../locales';

interface Props {
  metrics?: BacktestMetrics;
}

interface MetricCardProps {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}

function MetricCard({ label, value, positive, negative }: MetricCardProps) {
  const valueColor = positive ? 'text-green' : negative ? 'text-red' : 'text-text';

  return (
    <div className="bg-surface border border-border p-3 flex flex-col justify-between gap-1 min-w-0">
      <span
        className="text-[10px] font-semibold tracking-widest uppercase text-muted truncate"
        title={label}
      >
        {label}
      </span>
      <span className={`font-mono text-[13px] font-medium truncate ${valueColor}`}>{value}</span>
    </div>
  );
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export default function MetricsPanel({ metrics }: Props) {
  if (!metrics) {
    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-surface border border-border p-3 flex flex-col gap-1">
              <div className="h-3 w-16 bg-border rounded animate-pulse" />
              <div className="h-4 w-12 bg-border rounded animate-pulse" />
            </div>
          ))}
        </div>
        <p className="text-muted text-[11px] text-center">{t.metrics.placeholder}</p>
      </div>
    );
  }

  const tpCount = metrics.exitCounts.TP ?? 0;
  const slCount = metrics.exitCounts.SL ?? 0;
  const mhCount = metrics.exitCounts.MH ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-8 gap-2">
        <MetricCard label={t.metrics.totalTrades} value={String(metrics.totalTrades)} />
        <MetricCard
          label={t.metrics.winRate}
          value={`${metrics.winRate.toFixed(1)}%`}
          positive={metrics.winRate >= 50}
          negative={metrics.winRate < 50}
        />
        <MetricCard
          label={t.metrics.totalReturn}
          value={formatPercent(metrics.totalReturn)}
          positive={metrics.totalReturn > 0}
          negative={metrics.totalReturn < 0}
        />
        <MetricCard
          label={t.metrics.avgTrade}
          value={formatPercent(metrics.avgTradeReturn)}
          positive={metrics.avgTradeReturn > 0}
          negative={metrics.avgTradeReturn < 0}
        />
        <MetricCard
          label={t.metrics.maxDrawdown}
          value={`-${metrics.maxDrawdown.toFixed(2)}%`}
          negative={metrics.maxDrawdown > 0}
        />
        <MetricCard label={t.metrics.tpExits} value={String(tpCount)} positive={tpCount > 0} />
        <MetricCard label={t.metrics.slExits} value={String(slCount)} negative={slCount > 0} />
        <MetricCard label={t.metrics.mhExits} value={String(mhCount)} />
      </div>
    </div>
  );
}
