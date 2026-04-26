import ChartLineIcon from '../../components/Icons/ChartLineIcon';
import t from '../../locales';
import { Candle } from '../../types/global.types';
import { usePriceChart } from './usePriceChart';

interface Props {
  candles?: Candle[];
}

export default function PriceChart({ candles }: Props) {
  const { chartPaneRef, hasCandles } = usePriceChart(candles);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
        {t.holdChart.title}
      </span>
      {hasCandles ? (
        <div className="border border-border bg-surface">
          <div ref={chartPaneRef} className="w-full" />
        </div>
      ) : (
        <div className="border border-border bg-surface h-[150px] flex flex-col items-center justify-center gap-2">
          <ChartLineIcon />
          <span className="text-muted text-[11px]">{t.holdChart.placeholder}</span>
        </div>
      )}
    </div>
  );
}
