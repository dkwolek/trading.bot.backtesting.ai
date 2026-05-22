import {
  ColorType,
  createChart,
  IChartApi,
  IPriceLine,
  ISeriesApi,
  LineData,
  UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { RealizedSnapshot } from '../../algos/auto-grid.algo';
import { Candle } from '../../types/global.types';
import { toUTCTimestamp } from '../Chart/chart.utils';
import { buildStrategyLineData } from './strategyChart.utils';

const PRIMARY_COLOR = '#3b82f6';
const COMPARISON_COLOR = '#a78bfa';
const PRICE_COLOR = 'rgba(160, 160, 180, 0.35)';
const PRICE_SCALE_ID = 'price-bg';
const MAX_PRICE_POINTS = 200;

function buildPriceLineData(candles: Candle[]): LineData<UTCTimestamp>[] {
  // Down-sample to ~MAX_PRICE_POINTS evenly spaced closes — feeds the
  // background price overlay. Same approach as the strategy line so the
  // two share resolution and don't visually drift on zoom.
  const step = Math.max(1, Math.floor(candles.length / MAX_PRICE_POINTS));
  const points: LineData<UTCTimestamp>[] = [];
  for (let index = 0; index < candles.length; index += step) {
    points.push({
      time: toUTCTimestamp(candles[index].time),
      value: candles[index].close,
    });
  }
  const last = candles[candles.length - 1];
  const lastPushed = points[points.length - 1];
  if (lastPushed && lastPushed.time !== toUTCTimestamp(last.time)) {
    points.push({ time: toUTCTimestamp(last.time), value: last.close });
  }
  return points;
}

export function useStrategyChart(
  candles: Candle[] | undefined,
  primaryHistory: RealizedSnapshot[],
  primaryUnrealizedHistory: RealizedSnapshot[],
  comparisonHistory: RealizedSnapshot[] | null,
  initialAmount: number
) {
  const chartPaneRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const primarySeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const comparisonSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
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
      // Hidden left scale dedicated to the background price line — keeps
      // the absolute-magnitude difference (BTC at $80k vs balance at
      // $100) from squashing the strategy series.
      leftPriceScale: { borderColor: '#22222e', visible: false },
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

    const price = chart.addLineSeries({
      color: PRICE_COLOR,
      lineWidth: 1,
      priceScaleId: PRICE_SCALE_ID,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    chart.priceScale(PRICE_SCALE_ID).applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.05 },
      visible: false,
    });

    const primary = chart.addLineSeries({
      color: PRIMARY_COLOR,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    chartRef.current = chart;
    primarySeriesRef.current = primary;
    priceSeriesRef.current = price;

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
      primarySeriesRef.current = null;
      comparisonSeriesRef.current = null;
      priceSeriesRef.current = null;
    };
  }, [hasCandles]);

  // Add/remove the comparison series independently so toggling
  // compounding doesn't tear down the whole chart.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }
    if (comparisonHistory === null) {
      if (comparisonSeriesRef.current) {
        chart.removeSeries(comparisonSeriesRef.current);
        comparisonSeriesRef.current = null;
      }
      return;
    }
    if (!comparisonSeriesRef.current) {
      comparisonSeriesRef.current = chart.addLineSeries({
        color: COMPARISON_COLOR,
        lineWidth: 1,
        lineStyle: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
    }
  }, [comparisonHistory !== null]);

  useEffect(() => {
    if (!primarySeriesRef.current || !candles || candles.length === 0) {
      return;
    }

    if (priceLineRef.current) {
      primarySeriesRef.current.removePriceLine(priceLineRef.current);
    }

    primarySeriesRef.current.setData(
      buildStrategyLineData(candles, primaryHistory, primaryUnrealizedHistory, initialAmount)
    );

    if (comparisonSeriesRef.current && comparisonHistory) {
      comparisonSeriesRef.current.setData(
        buildStrategyLineData(candles, comparisonHistory, [], initialAmount)
      );
    }

    if (priceSeriesRef.current) {
      priceSeriesRef.current.setData(buildPriceLineData(candles));
    }

    priceLineRef.current = primarySeriesRef.current.createPriceLine({
      price: initialAmount,
      color: '#4a4a5a',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '',
    });

    // Only auto-fit on first load or when the dataset itself changes
    // size (pair / period / interval switch). Skipping it on parameter
    // tweaks preserves any zoom/pan the user has applied — otherwise
    // sliding a slider would slam them back to fit-content every time.
    if (lastCandleCountRef.current !== candles.length) {
      chartRef.current?.timeScale().fitContent();
      lastCandleCountRef.current = candles.length;
    }
  }, [candles, primaryHistory, primaryUnrealizedHistory, comparisonHistory, initialAmount]);

  return { chartPaneRef, hasCandles };
}
