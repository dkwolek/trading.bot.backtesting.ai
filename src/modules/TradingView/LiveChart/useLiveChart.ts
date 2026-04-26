import {
  ColorType,
  createChart,
  IChartApi,
  ISeriesApi,
  SeriesMarker,
  CandlestickData,
  HistogramData,
  UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { Candle } from '../../../types/global.types';
import { formatCetTickMark, formatCetTime } from '../../../utils/chart-time';

export interface LiveSignal {
  time: number;
  type: 'buy' | 'sell';
  label: string;
}

const SMA_COLORS = ['#f59e0b', '#3b82f6', '#a855f7', '#ef4444', '#10b981'];

function toUTC(time: number): UTCTimestamp {
  return time as UTCTimestamp;
}

function candleToChart(candle: Candle): CandlestickData<UTCTimestamp> {
  return {
    time: toUTC(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
}

function candleToVolume(candle: Candle): HistogramData<UTCTimestamp> {
  return {
    time: toUTC(candle.time),
    value: candle.volume,
    color: candle.close >= candle.open ? '#00d4aa' : '#ff4757',
  };
}

function computeSmaFromCandles(
  candles: Candle[],
  period: number
): { time: UTCTimestamp; value: number }[] {
  if (candles.length < period) {
    return [];
  }
  const data: { time: UTCTimestamp; value: number }[] = [];
  let sum = 0;
  for (let index = 0; index < candles.length; index++) {
    sum += candles[index].close;
    if (index >= period) {
      sum -= candles[index - period].close;
    }
    if (index >= period - 1) {
      data.push({ time: toUTC(candles[index].time), value: sum / period });
    }
  }
  return data;
}

interface FilterSlider {
  value: number;
  enabled: boolean;
}

export interface SignalConfig {
  dropPct: FilterSlider;
  dropWindow: FilterSlider;
  higherLow: boolean;
  trendDir: 'rising' | 'falling' | 'any';
}

function playSignalSound(type: 'buy' | 'sell') {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = type === 'buy' ? 880 : 440;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

function analyzeHistory(candles: Candle[], config: SignalConfig): LiveSignal[] {
  const signals: LiveSignal[] = [];
  if (candles.length < 2) {
    return signals;
  }

  // Drop% is the trigger: disabled → no signals at all
  if (!config.dropPct.enabled || config.dropPct.value <= 0) {
    return signals;
  }
  // Drop window is required to measure a drop: disabled → no signals
  if (!config.dropWindow.enabled || config.dropWindow.value < 1) {
    return signals;
  }

  const dropWindow = config.dropWindow.value;
  const dropPctThreshold = config.dropPct.value / 100;
  const higherLow = config.higherLow;
  const allowLong = config.trendDir === 'rising' || config.trendDir === 'any';
  const allowShort = config.trendDir === 'falling' || config.trendDir === 'any';

  let dropTriggered: 'buy' | 'sell' | null = null;
  let dropChangePct = 0;

  for (let index = 1; index < candles.length; index++) {
    if (index < dropWindow) {
      continue;
    }

    // Phase 2: drop was detected, wait for higher-low confirmation (if enabled)
    if (dropTriggered) {
      const reversalOk =
        !higherLow ||
        (dropTriggered === 'buy'
          ? candles[index].low > candles[index - 1].low
          : candles[index].high < candles[index - 1].high);
      if (reversalOk) {
        signals.push({
          time: candles[index].time,
          type: dropTriggered,
          label:
            dropTriggered === 'buy'
              ? `BUY ${(dropChangePct * 100).toFixed(1)}%`
              : `SELL +${(dropChangePct * 100).toFixed(1)}%`,
        });
        dropTriggered = null;
      }
      continue;
    }

    // Phase 1: detect drop/pump exceeding threshold; respect trendDir
    const startPrice = candles[index - dropWindow].close;
    const currentPrice = candles[index].close;
    const changePct = (currentPrice - startPrice) / startPrice;

    if (allowLong && changePct <= -dropPctThreshold) {
      dropTriggered = 'buy';
      dropChangePct = changePct;
    } else if (allowShort && changePct >= dropPctThreshold) {
      dropTriggered = 'sell';
      dropChangePct = changePct;
    }
  }

  return signals;
}

const PRICE_SCALE_WIDTH = 64;

export function useLiveChart(smaPeriods: number[], signalCfg?: SignalConfig) {
  const priceChartPaneRef = useRef<HTMLDivElement>(null);
  const volumeChartPaneRef = useRef<HTMLDivElement>(null);
  const priceChartRef = useRef<IChartApi | null>(null);
  const volumeChartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaSeriesRefs = useRef<ISeriesApi<'Line'>[]>([]);
  const candlesRef = useRef<Candle[]>([]);
  const currentBarRef = useRef<Candle | null>(null);
  const lastSmaKey = useRef('');
  const historySignalsRef = useRef<LiveSignal[]>([]);
  const liveSignalsRef = useRef<LiveSignal[]>([]);
  const lastPriceRef = useRef(0);

  // Create charts
  useEffect(() => {
    if (!priceChartPaneRef.current || !volumeChartPaneRef.current) {
      return;
    }

    const sharedOptions = {
      layout: {
        background: { type: ColorType.Solid, color: '#16161d' },
        textColor: '#e2e8f0',
      },
      grid: {
        vertLines: { color: '#22222e' },
        horzLines: { color: '#22222e' },
      },
      rightPriceScale: { borderColor: '#22222e' },
      localization: { timeFormatter: formatCetTime },
      crosshair: {
        vertLine: { labelVisible: true, labelBackgroundColor: '#22222e' },
        horzLine: { labelVisible: true, labelBackgroundColor: '#22222e' },
      },
      handleScroll: true,
      handleScale: true,
    };

    const priceChart = createChart(priceChartPaneRef.current, {
      ...sharedOptions,
      timeScale: {
        borderColor: '#22222e',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        shiftVisibleRangeOnNewBar: true,
        fixLeftEdge: true,
        tickMarkFormatter: formatCetTickMark,
      },
      autoSize: true,
    });

    const volumeChart = createChart(volumeChartPaneRef.current, {
      ...sharedOptions,
      timeScale: {
        borderColor: '#22222e',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        shiftVisibleRangeOnNewBar: true,
        fixLeftEdge: true,
        tickMarkFormatter: formatCetTickMark,
      },
      autoSize: true,
    });

    const series = priceChart.addCandlestickSeries({
      upColor: '#00d4aa',
      downColor: '#ff4757',
      borderVisible: false,
      wickUpColor: '#00d4aa',
      wickDownColor: '#ff4757',
    });

    const volumeSeries = volumeChart.addHistogramSeries({
      priceFormat: { type: 'volume' },
    });

    // Match price-scale widths so candles align vertically with volume bars
    priceChart.priceScale('right').applyOptions({
      minimumWidth: PRICE_SCALE_WIDTH,
      scaleMargins: { top: 0.05, bottom: 0.05 },
    });
    volumeChart.priceScale('right').applyOptions({
      minimumWidth: PRICE_SCALE_WIDTH,
      scaleMargins: { top: 0.1, bottom: 0 },
    });

    priceChartRef.current = priceChart;
    volumeChartRef.current = volumeChart;
    candleSeriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;

    // Sync time scales bidirectionally
    let syncing = false;
    function syncFromPrice() {
      if (syncing) {
        return;
      }
      const range = priceChart.timeScale().getVisibleLogicalRange();
      if (range) {
        syncing = true;
        volumeChart.timeScale().setVisibleLogicalRange(range);
        syncing = false;
      }
    }
    function syncFromVolume() {
      if (syncing) {
        return;
      }
      const range = volumeChart.timeScale().getVisibleLogicalRange();
      if (range) {
        syncing = true;
        priceChart.timeScale().setVisibleLogicalRange(range);
        syncing = false;
      }
    }
    priceChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromPrice);
    volumeChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromVolume);

    return () => {
      priceChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromPrice);
      volumeChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromVolume);
      priceChart.remove();
      volumeChart.remove();
      priceChartRef.current = null;
      volumeChartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      smaSeriesRefs.current = [];
    };
  }, []);

  // Manage SMA series
  useEffect(() => {
    const chart = priceChartRef.current;
    if (!chart) {
      return;
    }
    const key = smaPeriods.join(',');
    if (key === lastSmaKey.current) {
      return;
    }
    lastSmaKey.current = key;

    for (const series of smaSeriesRefs.current) {
      chart.removeSeries(series);
    }
    smaSeriesRefs.current = [];

    const active = smaPeriods.filter((period) => period > 0);
    for (let index = 0; index < active.length; index++) {
      const series = chart.addLineSeries({
        color: SMA_COLORS[index % SMA_COLORS.length],
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      smaSeriesRefs.current.push(series);
    }

    recomputeSMAs();
  }, [smaPeriods]);

  /**
   * Load historical candles (call once on mount).
   */
  function loadHistory(candles: Candle[]) {
    candlesRef.current = [...candles];
    if (candles.length > 0) {
      lastPriceRef.current = candles[candles.length - 1].close;
    }
    if (candleSeriesRef.current) {
      candleSeriesRef.current.setData(candles.map(candleToChart));
      priceChartRef.current?.timeScale().fitContent();
    }
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(candles.map(candleToVolume));
      volumeChartRef.current?.timeScale().fitContent();
    }
    recomputeSMAs();
  }

  function addSignal(signal: LiveSignal) {
    liveSignalsRef.current.push(signal);
    if (liveSignalsRef.current.length > 100) {
      liveSignalsRef.current.shift();
    }
    playSignalSound(signal.type);
    updateMarkers();
  }

  function updateMarkers() {
    if (!candleSeriesRef.current) {
      return;
    }
    const allSignals = [...historySignalsRef.current, ...liveSignalsRef.current];
    const markers: SeriesMarker<UTCTimestamp>[] = allSignals.map((signal) => {
      const isBuy = signal.type === 'buy';
      return {
        time: (signal.time - (signal.time % 60)) as UTCTimestamp,
        position: isBuy ? ('belowBar' as const) : ('aboveBar' as const),
        shape: isBuy ? ('arrowUp' as const) : ('arrowDown' as const),
        color: isBuy ? '#00d4aa' : '#ff4757',
        text: signal.label,
      };
    });
    markers.sort((markerA, markerB) => markerA.time - markerB.time);
    const deduped = markers.filter(
      (marker, index) =>
        index === 0 ||
        marker.time !== markers[index - 1].time ||
        marker.text !== markers[index - 1].text
    );
    candleSeriesRef.current.setMarkers(deduped);
  }

  /**
   * Update with a new tick price. Aggregates into 1-minute candles.
   * Detects slippage spikes.
   */
  function addTick(price: number) {
    // Reject ticks that are wildly different from last known price (wrong pair leak)
    if (lastPriceRef.current > 0) {
      const change = Math.abs(price - lastPriceRef.current) / lastPriceRef.current;
      if (change > 0.5) {
        return;
      }
    }
    lastPriceRef.current = price;
    const now = Math.floor(Date.now() / 1000);
    const barTime = now - (now % 60);

    if (currentBarRef.current && currentBarRef.current.time === barTime) {
      const bar = currentBarRef.current;
      bar.high = Math.max(bar.high, price);
      bar.low = Math.min(bar.low, price);
      bar.close = price;
      candleSeriesRef.current?.update(candleToChart(bar));
      volumeSeriesRef.current?.update(candleToVolume(bar));
    } else {
      // Finalize previous bar
      if (currentBarRef.current) {
        const prev = currentBarRef.current;
        const candles = candlesRef.current;
        if (candles.length > 0 && candles[candles.length - 1].time === prev.time) {
          candles[candles.length - 1] = prev;
        } else {
          candles.push(prev);
        }
      }

      // Start new bar
      const newBar: Candle = {
        time: barTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
      };
      currentBarRef.current = newBar;
      candleSeriesRef.current?.update(candleToChart(newBar));
      volumeSeriesRef.current?.update(candleToVolume(newBar));

      // Update SMAs
      recomputeSMAs();
    }
  }

  function recomputeSMAs() {
    const active = smaPeriods.filter((period) => period > 0);
    const allCandles = [...candlesRef.current];
    if (currentBarRef.current) {
      allCandles.push(currentBarRef.current);
    }

    for (let index = 0; index < active.length; index++) {
      const series = smaSeriesRefs.current[index];
      if (series) {
        series.setData(computeSmaFromCandles(allCandles, active[index]));
      }
    }
  }

  function recomputeSignals(config: SignalConfig) {
    const allCandles = [...candlesRef.current];
    if (currentBarRef.current) {
      allCandles.push(currentBarRef.current);
    }
    historySignalsRef.current = analyzeHistory(allCandles, config);
    updateMarkers();
  }

  // Recompute when config changes
  const configKey = signalCfg ? JSON.stringify(signalCfg) : '';
  useEffect(() => {
    if (signalCfg && candlesRef.current.length > 0) {
      recomputeSignals(signalCfg);
    }
  }, [configKey]);

  return { priceChartPaneRef, volumeChartPaneRef, loadHistory, addTick, addSignal };
}
