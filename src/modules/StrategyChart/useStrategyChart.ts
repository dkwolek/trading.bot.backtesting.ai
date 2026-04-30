import { ColorType, createChart, IChartApi, IPriceLine, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { RealizedSnapshot } from '../../algos/auto-grid.algo';
import { Candle } from '../../types/global.types';
import { buildStrategyLineData } from './strategyChart.utils';

const PRIMARY_COLOR = '#3b82f6';
const COMPARISON_COLOR = '#a78bfa';

export function useStrategyChart(
  candles: Candle[] | undefined,
  primaryHistory: RealizedSnapshot[],
  comparisonHistory: RealizedSnapshot[] | null,
  initialAmount: number
) {
  const chartPaneRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const primarySeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const comparisonSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
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

    const primary = chart.addLineSeries({
      color: PRIMARY_COLOR,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    chartRef.current = chart;
    primarySeriesRef.current = primary;

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

    primarySeriesRef.current.setData(buildStrategyLineData(candles, primaryHistory, initialAmount));

    if (comparisonSeriesRef.current && comparisonHistory) {
      comparisonSeriesRef.current.setData(
        buildStrategyLineData(candles, comparisonHistory, initialAmount)
      );
    }

    priceLineRef.current = primarySeriesRef.current.createPriceLine({
      price: initialAmount,
      color: '#4a4a5a',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '',
    });

    chartRef.current?.timeScale().fitContent();
  }, [candles, primaryHistory, comparisonHistory, initialAmount]);

  return { chartPaneRef, hasCandles };
}
