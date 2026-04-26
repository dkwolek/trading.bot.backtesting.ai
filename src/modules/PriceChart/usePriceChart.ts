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

function buildPriceData(candles: Candle[]): LineData<UTCTimestamp>[] {
  if (candles.length === 0) {
    return [];
  }
  const maxPoints = 200;
  const step = Math.max(1, Math.floor(candles.length / maxPoints));
  const points: LineData<UTCTimestamp>[] = [];

  for (let index = 0; index < candles.length; index += step) {
    points.push({
      time: toUTCTimestamp(candles[index].time),
      value: candles[index].close,
    });
  }

  const lastCandle = candles[candles.length - 1];
  const lastPoint = points[points.length - 1];
  if (lastPoint && lastPoint.time !== toUTCTimestamp(lastCandle.time)) {
    points.push({
      time: toUTCTimestamp(lastCandle.time),
      value: lastCandle.close,
    });
  }

  return points;
}

export function usePriceChart(candles?: Candle[]) {
  const chartPaneRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const hasCandles = candles && candles.length > 0;

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
      height: 150,
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
      chart.timeScale().fitContent();
    });
    observer.observe(chartPaneRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [hasCandles]);

  useEffect(() => {
    if (!seriesRef.current || !candles || candles.length === 0) {
      return;
    }

    seriesRef.current.setData(buildPriceData(candles));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return { chartPaneRef, hasCandles };
}
