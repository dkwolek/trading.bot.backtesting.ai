import { ColorType, createChart, IChartApi, IPriceLine, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { Trade } from '../../types/algo.types';
import { Candle } from '../../types/global.types';
import { buildStrategyLineData } from './strategyChart.utils';

export function useStrategyChart(
  candles: Candle[] | undefined,
  trades: Trade[] | undefined,
  initialAmount: number,
  totalSlots: number
) {
  const chartPaneRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const hasCandles = candles && candles.length > 0;

  // Create chart instance (same pattern as PriceChart)
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
      color: '#3b82f6',
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

  // Update data (same pattern as PriceChart)
  useEffect(() => {
    if (!seriesRef.current || !candles || candles.length === 0) {
      return;
    }

    if (priceLineRef.current) {
      seriesRef.current.removePriceLine(priceLineRef.current);
    }

    seriesRef.current.setData(
      buildStrategyLineData(candles, trades ?? [], initialAmount, totalSlots)
    );

    priceLineRef.current = seriesRef.current.createPriceLine({
      price: initialAmount,
      color: '#4a4a5a',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '',
    });

    chartRef.current?.timeScale().fitContent();
  }, [candles, trades, initialAmount, totalSlots]);

  return { chartPaneRef, hasCandles };
}
