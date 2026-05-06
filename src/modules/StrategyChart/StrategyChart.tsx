import { useMemo } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import ChartLineIcon from '../../components/Icons/ChartLineIcon';
import t from '../../locales';
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
import { Candle } from '../../types/global.types';
import { useStrategyChart } from './useStrategyChart';

interface Props {
  candles?: Candle[];
}

export default function StrategyChart({ candles }: Props) {
  const { initialAmount, algoOptions } = useTradingContext();
  const stepPrice = resolveStepPrice(algoOptions);
  const amountPerLevel = resolveAmountPerLevel(algoOptions);
  const monthlyMode = resolveMonthlyMode(algoOptions);
  const monthlyAmount = resolveMonthlyAmount(algoOptions);
  const monthlyRangePct = resolveMonthlyRangePct(algoOptions);
  const dcaAllocationPct = resolveDcaAllocationPct(algoOptions);
  const weightedSizing = resolveWeightedSizing(algoOptions);

  const histories = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { primary: [], comparison: null };
    }
    const primary = simulateAutoGrid(candles, {
      stepPrice,
      amountPerLevel,
      initialAmount,
      monthlyMode,
      monthlyAmount,
      monthlyRangePct,
      dcaAllocationPct,
      weightedSizing,
    }).realizedHistory;
    return { primary, comparison: null };
  }, [
    candles,
    stepPrice,
    amountPerLevel,
    initialAmount,
    monthlyMode,
    monthlyAmount,
    monthlyRangePct,
    dcaAllocationPct,
    weightedSizing,
  ]);

  const { chartPaneRef, hasCandles } = useStrategyChart(
    candles,
    histories.primary,
    histories.comparison,
    initialAmount
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
          <span className="text-muted text-[11px]">{t.earningsChart.placeholder}</span>
        </div>
      )}
    </div>
  );
}
