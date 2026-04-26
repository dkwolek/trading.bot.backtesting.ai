import { useTradingContext } from '../../context/TradingContext';
import ChartLineIcon from '../../components/Icons/ChartLineIcon';
import t from '../../locales';
import { Trade } from '../../types/algo.types';
import { Candle } from '../../types/global.types';
import { useStrategyChart } from './useStrategyChart';

interface Props {
  trades?: Trade[];
  candles?: Candle[];
}

export default function StrategyChart({ trades, candles }: Props) {
  const { initialAmount, algoOptions } = useTradingContext();
  const mgAmount = algoOptions.autoGridAmountPerLevel;
  const totalSlots =
    typeof mgAmount === 'number' && mgAmount > 0 && initialAmount > 0
      ? Math.max(1, initialAmount / mgAmount)
      : 3;
  const { chartPaneRef, hasCandles } = useStrategyChart(candles, trades, initialAmount, totalSlots);

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
