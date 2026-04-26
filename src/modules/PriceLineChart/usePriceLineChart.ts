import {
  ColorType,
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { Candle } from '../../types/global.types';
import { toUTCTimestamp } from '../Chart/chart.utils';

const SMA_COLORS = ['#f59e0b', '#3b82f6', '#a855f7', '#ef4444', '#10b981'];

function computeSma(candles: Candle[], period: number): LineData<UTCTimestamp>[] {
  if (period <= 0 || candles.length < period) {
    return [];
  }
  const points: LineData<UTCTimestamp>[] = [];
  let sum = 0;
  for (let index = 0; index < candles.length; index++) {
    sum += candles[index].close;
    if (index >= period) {
      sum -= candles[index - period].close;
    }
    if (index >= period - 1) {
      points.push({ time: toUTCTimestamp(candles[index].time), value: sum / period });
    }
  }
  return points;
}

function samplePriceData(candles: Candle[]): LineData<UTCTimestamp>[] {
  if (candles.length === 0) {
    return [];
  }
  const maxPoints = 500;
  const step = Math.max(1, Math.floor(candles.length / maxPoints));
  const points: LineData<UTCTimestamp>[] = [];
  for (let index = 0; index < candles.length; index += step) {
    points.push({ time: toUTCTimestamp(candles[index].time), value: candles[index].close });
  }
  const lastCandle = candles[candles.length - 1];
  const lastPoint = points[points.length - 1];
  if (lastPoint && lastPoint.time !== toUTCTimestamp(lastCandle.time)) {
    points.push({ time: toUTCTimestamp(lastCandle.time), value: lastCandle.close });
  }
  return points;
}

export function usePriceLineChart(candles: Candle[] | undefined, smaPeriods: number[]) {
  const chartPaneRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const smaSeriesRefs = useRef<ISeriesApi<'Line'>[]>([]);
  const hasCandles = candles && candles.length > 0;

  // Recreate chart when candles change
  useEffect(() => {
    if (!chartPaneRef.current || !hasCandles) {
      return;
    }

    const chart = createChart(chartPaneRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#16161d' },
        textColor: '#e2e8f0',
      },
      grid: {
        vertLines: { color: '#22222e' },
        horzLines: { color: '#22222e' },
      },
      rightPriceScale: { borderColor: '#22222e' },
      timeScale: { borderColor: '#22222e', timeVisible: true, secondsVisible: false },
      crosshair: {
        vertLine: { labelVisible: true, labelBackgroundColor: '#22222e' },
        horzLine: { labelVisible: true, labelBackgroundColor: '#22222e' },
      },
      height: 200,
      handleScroll: true,
      handleScale: true,
    });

    const priceSeries = chart.addLineSeries({
      color: '#e2e8f0',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      lastValueVisible: true,
    });

    chartRef.current = chart;
    priceSeriesRef.current = priceSeries;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
      chart.timeScale().fitContent();
    });
    observer.observe(chartPaneRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      smaSeriesRefs.current = [];
    };
  }, [hasCandles]);

  // Update data when candles or SMA periods change
  useEffect(() => {
    const chart = chartRef.current;
    const priceSeries = priceSeriesRef.current;
    if (!chart || !priceSeries || !candles || candles.length === 0) {
      return;
    }

    // Set price data
    priceSeries.setData(samplePriceData(candles));

    // Remove old SMA series
    for (const oldSeries of smaSeriesRefs.current) {
      chart.removeSeries(oldSeries);
    }
    smaSeriesRefs.current = [];

    // Add new SMA series
    const activePeriods = smaPeriods.filter((period) => period > 0);
    for (let index = 0; index < activePeriods.length; index++) {
      const period = activePeriods[index];
      const color = SMA_COLORS[index % SMA_COLORS.length];
      const smaSeries = chart.addLineSeries({
        color,
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      smaSeries.setData(computeSma(candles, period));
      smaSeriesRefs.current.push(smaSeries);
    }

    chart.timeScale().fitContent();
  }, [candles, smaPeriods]);

  return { chartPaneRef, hasCandles };
}
