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
import ChartLineIcon from '../../components/Icons/ChartLineIcon';
import { Candle } from '../../types/global.types';
import { usePnlChart } from './usePnlChart';

interface Props {
  candles?: Candle[];
}

export default function PnlChart({ candles }: Props) {
  const { initialAmount, algoOptions } = useTradingContext();
  const stepPrice = resolveStepPrice(algoOptions);
  const amountPerLevel = resolveAmountPerLevel(algoOptions);
  const monthlyMode = resolveMonthlyMode(algoOptions);
  const monthlyAmount = resolveMonthlyAmount(algoOptions);
  const monthlyRangePct = resolveMonthlyRangePct(algoOptions);
  const dcaAllocationPct = resolveDcaAllocationPct(algoOptions);

  const histories = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { realized: [], unrealized: [] };
    }
    const result = simulateAutoGrid(candles, {
      stepPrice,
      amountPerLevel,
      initialAmount,
      monthlyMode,
      monthlyAmount,
      monthlyRangePct,
      dcaAllocationPct,
    });
    return { realized: result.realizedHistory, unrealized: result.unrealizedHistory };
  }, [
    candles,
    stepPrice,
    amountPerLevel,
    initialAmount,
    monthlyMode,
    monthlyAmount,
    monthlyRangePct,
    dcaAllocationPct,
  ]);

  const { chartPaneRef, hasCandles } = usePnlChart(
    candles,
    histories.realized,
    histories.unrealized
  );

  return (
    <div className="flex flex-col gap-2">
      {hasCandles ? (
        <div className="border border-border bg-surface">
          <div ref={chartPaneRef} className="w-full" />
        </div>
      ) : (
        <div className="border border-border bg-surface h-[150px] flex flex-col items-center justify-center gap-2">
          <ChartLineIcon />
          <span className="text-muted text-[11px]">Run a simulation to see PnL</span>
        </div>
      )}
    </div>
  );
}
