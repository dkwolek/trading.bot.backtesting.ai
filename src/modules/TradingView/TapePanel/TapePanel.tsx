import { useMemo } from 'react';
import { WsTrade } from '../../../services/kraken-ws';

interface Props {
  trades: WsTrade[];
}

interface Stats {
  buyVolume: number;
  sellVolume: number;
  buyCount: number;
  sellCount: number;
}

function computeStats(trades: WsTrade[]): Stats {
  let buyVolume = 0;
  let sellVolume = 0;
  let buyCount = 0;
  let sellCount = 0;

  for (const trade of trades) {
    if (trade.side === 'buy') {
      buyVolume += trade.volume;
      buyCount++;
    } else {
      sellVolume += trade.volume;
      sellCount++;
    }
  }

  return { buyVolume, sellVolume, buyCount, sellCount };
}

function PressureBar({
  label,
  buyValue,
  sellValue,
  buyLabel,
  sellLabel,
}: {
  label: string;
  buyValue: number;
  sellValue: number;
  buyLabel: string;
  sellLabel: string;
}) {
  const total = buyValue + sellValue;
  const buyPct = total > 0 ? (buyValue / total) * 100 : 50;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] text-muted">{label}</span>
      <div className="relative h-6 flex rounded-sm overflow-hidden border border-border">
        <div
          className="bg-green/30 flex items-center justify-start px-1.5 transition-all duration-500"
          style={{ width: `${buyPct}%` }}
        >
          <span className="text-[9px] font-mono text-green whitespace-nowrap">{buyLabel}</span>
        </div>
        <div
          className="bg-red/30 flex items-center justify-end px-1.5 transition-all duration-500"
          style={{ width: `${100 - buyPct}%` }}
        >
          <span className="text-[9px] font-mono text-red whitespace-nowrap">{sellLabel}</span>
        </div>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-text">
          {buyPct.toFixed(0)}% / {(100 - buyPct).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export default function TapePanel({ trades }: Props) {
  const stats = useMemo(() => computeStats(trades), [trades]);
  const totalTrades = stats.buyCount + stats.sellCount;

  return (
    <div className="flex flex-col gap-1.5 border border-border rounded-sm bg-surface p-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
          Pressure
        </span>
        <span className="text-[9px] font-mono text-muted">{totalTrades} trades</span>
      </div>
      <PressureBar
        label="Volume"
        buyValue={stats.buyVolume}
        sellValue={stats.sellVolume}
        buyLabel={stats.buyVolume.toFixed(2)}
        sellLabel={stats.sellVolume.toFixed(2)}
      />
      <PressureBar
        label="Count"
        buyValue={stats.buyCount}
        sellValue={stats.sellCount}
        buyLabel={String(stats.buyCount)}
        sellLabel={String(stats.sellCount)}
      />
    </div>
  );
}
