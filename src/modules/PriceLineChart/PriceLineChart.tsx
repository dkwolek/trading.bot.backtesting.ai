import { useState } from 'react';
import ChartLineIcon from '../../components/Icons/ChartLineIcon';
import t from '../../locales';
import { Candle } from '../../types/global.types';
import { usePriceLineChart } from './usePriceLineChart';

interface Props {
  candles?: Candle[];
}

export default function PriceLineChart({ candles }: Props) {
  const [smaInput, setSmaInput] = useState('50, 200');
  const smaPeriods = smaInput
    .split(',')
    .map((val) => parseInt(val.trim(), 10))
    .filter((val) => !isNaN(val) && val > 0);
  const { chartPaneRef, hasCandles } = usePriceLineChart(candles, smaPeriods);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
          {t.priceLineChart.title}
        </span>
        <input
          type="text"
          value={smaInput}
          onChange={(event) => setSmaInput(event.target.value)}
          placeholder="50, 200"
          className="w-32 px-2 py-0.5 bg-bg border border-border rounded-sm font-mono text-[10px] text-text outline-none focus:border-accent transition-colors text-right"
        />
      </div>
      {hasCandles ? (
        <div className="border border-border bg-surface">
          <div ref={chartPaneRef} className="w-full" />
        </div>
      ) : (
        <div className="border border-border bg-surface h-[200px] flex flex-col items-center justify-center gap-2">
          <ChartLineIcon />
          <span className="text-muted text-[11px]">{t.priceLineChart.placeholder}</span>
        </div>
      )}
    </div>
  );
}
