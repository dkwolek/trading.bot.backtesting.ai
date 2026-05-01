import { useMemo } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import ChartLineIcon from '../../components/Icons/ChartLineIcon';
import t from '../../locales';
import {
  resolveAmountPerLevel,
  resolveAtrMultiplier,
  resolveAtrPeriod,
  resolveChaseAfterTp,
  resolveCompounding,
  resolveStepPrice,
  resolveVolAdaptiveStep,
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
  const compounding = resolveCompounding(algoOptions);
  const volAdaptiveStep = resolveVolAdaptiveStep(algoOptions);
  const atrPeriod = resolveAtrPeriod(algoOptions);
  const atrMultiplier = resolveAtrMultiplier(algoOptions);
  const chaseAfterTp = resolveChaseAfterTp(algoOptions);

  const histories = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { primary: [], comparison: null };
    }
    const primary = simulateAutoGrid(candles, {
      stepPrice,
      amountPerLevel,
      compounding,
      volAdaptiveStep,
      atrPeriod,
      atrMultiplier,
      chaseAfterTp,
    }).realizedHistory;
    if (!compounding) {
      return { primary, comparison: null };
    }
    const comparison = simulateAutoGrid(candles, {
      stepPrice,
      amountPerLevel,
      compounding: false,
      volAdaptiveStep,
      atrPeriod,
      atrMultiplier,
      chaseAfterTp,
    }).realizedHistory;
    return { primary, comparison };
  }, [
    candles,
    stepPrice,
    amountPerLevel,
    compounding,
    volAdaptiveStep,
    atrPeriod,
    atrMultiplier,
    chaseAfterTp,
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
