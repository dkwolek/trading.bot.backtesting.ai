import { useEffect, useRef, useState } from 'react';
import { useTradingContext } from '../../../context/TradingContext';
import {
  Interval,
  PAIR_DATA_SOURCE,
  DataSource,
  Period,
} from '../../../constants/global.constants';
import { fetchKlines } from '../../../services/binance';
import { useLiveChart } from './useLiveChart';

interface Props {
  price: number;
}

export default function LiveChart({ price }: Props) {
  const { selectedPair, signalConfig } = useTradingContext();
  const [smaInput, setSmaInput] = useState('50, 200');
  const smaPeriods = smaInput
    .split(',')
    .map((val) => parseInt(val.trim(), 10))
    .filter((val) => !isNaN(val) && val > 0);

  const { priceChartPaneRef, volumeChartPaneRef, loadHistory, addTick } = useLiveChart(
    smaPeriods,
    signalConfig
  );
  const [ready, setReady] = useState(false);
  const skippedFirst = useRef(false);

  // Load historical candles on mount
  useEffect(() => {
    setReady(false);
    skippedFirst.current = false;

    const source = PAIR_DATA_SOURCE[selectedPair];
    if (source !== DataSource.Binance) {
      setReady(true);
      return;
    }

    async function load() {
      try {
        const candles = await fetchKlines(selectedPair, Period.SEVEN_DAYS, Interval.ONE_MINUTE);
        if (candles.length > 0) {
          loadHistory(candles);
        }
      } catch {
        // Ignore fetch errors
      }
      setReady(true);
    }

    load();
  }, [selectedPair]);

  // Feed live ticks only after history is loaded, skip the first tick
  useEffect(() => {
    if (price <= 0 || !ready) {
      return;
    }
    if (!skippedFirst.current) {
      skippedFirst.current = true;
      return;
    }
    addTick(price);
  }, [price, ready]);

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
          Live Chart
        </span>
        <div className="flex gap-2 items-center">
          <label className="text-[9px] text-muted">SMA</label>
          <input
            type="text"
            value={smaInput}
            onChange={(event) => setSmaInput(event.target.value)}
            placeholder="50, 200"
            className="w-24 px-1 py-0.5 bg-bg border border-border rounded-sm font-mono text-[9px] text-text outline-none focus:border-accent text-right"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="border border-border bg-surface flex-[2] min-h-0 overflow-hidden">
          <div ref={priceChartPaneRef} className="w-full h-full" />
        </div>
        <div className="border border-border bg-surface flex-[1] min-h-0 overflow-hidden">
          <div ref={volumeChartPaneRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
