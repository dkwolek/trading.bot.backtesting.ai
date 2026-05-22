import {
  ColorType,
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { RealizedSnapshot } from '../../algos/auto-grid.algo';
import { Candle } from '../../types/global.types';
import { toUTCTimestamp } from '../Chart/chart.utils';

const REALIZED_COLOR = '#3b82f6';
const UNREALIZED_COLOR = '#a78bfa';
const ZERO_LINE_COLOR = '#4a4a5a';
const MAX_POINTS = 200;

function buildPnlLineData(
  candles: Candle[],
  history: RealizedSnapshot[]
): LineData<UTCTimestamp>[] {
  if (candles.length === 0 || history.length === 0) {
    return [];
  }

  const sorted = [...history].sort((first, second) => first.time - second.time);
  const step = Math.max(1, Math.floor(candles.length / MAX_POINTS));
  const points: LineData<UTCTimestamp>[] = [];
  let historyIndex = 0;
  let current = 0;

  function advanceTo(time: number) {
    while (historyIndex < sorted.length && sorted[historyIndex].time <= time) {
      current = sorted[historyIndex].cumulative;
      historyIndex += 1;
    }
  }

  for (let index = 0; index < candles.length; index += step) {
    advanceTo(candles[index].time);
    points.push({ time: toUTCTimestamp(candles[index].time), value: current });
  }

  const lastCandle = candles[candles.length - 1];
  const lastPoint = points[points.length - 1];
  if (lastPoint && lastPoint.time !== toUTCTimestamp(lastCandle.time)) {
    advanceTo(lastCandle.time);
    points.push({ time: toUTCTimestamp(lastCandle.time), value: current });
  }

  return points;
}

export function usePnlChart(
  candles: Candle[] | undefined,
  realizedHistory: RealizedSnapshot[],
  unrealizedHistory: RealizedSnapshot[]
) {
  const chartPaneRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const realizedSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const unrealizedSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lastCandleCountRef = useRef(0);
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
      height: 140,
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: false },
        mouseWheel: true,
        pinch: true,
      },
    });

    realizedSeriesRef.current = chart.addLineSeries({
      color: REALIZED_COLOR,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      title: 'realized',
    });

    unrealizedSeriesRef.current = chart.addLineSeries({
      color: UNREALIZED_COLOR,
      lineWidth: 1,
      lineStyle: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      title: 'unrealized',
    });

    realizedSeriesRef.current.createPriceLine({
      price: 0,
      color: ZERO_LINE_COLOR,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: false,
      title: '',
    });

    chartRef.current = chart;

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
      realizedSeriesRef.current = null;
      unrealizedSeriesRef.current = null;
    };
  }, [hasCandles]);

  useEffect(() => {
    if (
      !realizedSeriesRef.current ||
      !unrealizedSeriesRef.current ||
      !candles ||
      candles.length === 0
    ) {
      return;
    }

    realizedSeriesRef.current.setData(buildPnlLineData(candles, realizedHistory));
    unrealizedSeriesRef.current.setData(buildPnlLineData(candles, unrealizedHistory));

    if (lastCandleCountRef.current !== candles.length) {
      chartRef.current?.timeScale().fitContent();
      lastCandleCountRef.current = candles.length;
    }
  }, [candles, realizedHistory, unrealizedHistory]);

  return { chartPaneRef, hasCandles };
}
