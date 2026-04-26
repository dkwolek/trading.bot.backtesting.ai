import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useCallback, useEffect, useRef } from 'react';
import { Candle } from '../../../types/global.types';
import { toCandlestickData, toLineData } from '../chart.utils';

// Load the full dataset upfront so trade markers (whose times can land
// anywhere across the period) all match a data point. Capping the
// initial slice would leave older markers invisible because lightweight-
// charts ignores markers outside the series' loaded time range.
const BUFFER = 200;

export interface LoadedRangeRef {
  current: { start: number; end: number };
}

export function useChartData(
  chartRef: React.MutableRefObject<IChartApi | null>,
  seriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>,
  candleSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>,
  candles: Candle[]
) {
  const loadedRangeRef = useRef({ start: 0, end: 0 });
  const candlesRef = useRef(candles);
  candlesRef.current = candles;

  const loadRange = useCallback(
    (start: number, end: number) => {
      const series = seriesRef.current;
      if (!series) {
        return;
      }

      const clampedStart = Math.max(0, start);
      const clampedEnd = Math.min(candlesRef.current.length, end);

      const alreadyLoaded =
        clampedStart >= loadedRangeRef.current.start && clampedEnd <= loadedRangeRef.current.end;

      const newStart = alreadyLoaded
        ? loadedRangeRef.current.start
        : Math.min(clampedStart, loadedRangeRef.current.start || clampedStart);
      const newEnd = alreadyLoaded
        ? loadedRangeRef.current.end
        : Math.max(clampedEnd, loadedRangeRef.current.end || clampedEnd);

      const slice = candlesRef.current.slice(newStart, newEnd);

      if (!alreadyLoaded) {
        series.setData(slice.map(toLineData));
        candleSeriesRef.current?.setData(slice.map(toCandlestickData));
      }

      loadedRangeRef.current = { start: newStart, end: newEnd };
    },
    [seriesRef, candleSeriesRef]
  );

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) {
      return;
    }

    loadedRangeRef.current = { start: 0, end: 0 };

    loadRange(0, candles.length);
    chartRef.current?.timeScale().fitContent();
  }, [candles, loadRange, chartRef, seriesRef]);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || candles.length === 0) {
      return;
    }

    function handleVisibleRangeChange() {
      const range = chart!.timeScale().getVisibleLogicalRange();
      if (!range) {
        return;
      }

      const { start: loadedStart, end: loadedEnd } = loadedRangeRef.current;
      const totalLoaded = loadedEnd - loadedStart;

      if (range.from < BUFFER && loadedStart > 0) {
        const newStart = Math.max(0, loadedStart - BUFFER);
        loadRange(newStart, loadedEnd);
      }

      if (range.to > totalLoaded - BUFFER && loadedEnd < candlesRef.current.length) {
        const newEnd = Math.min(candlesRef.current.length, loadedEnd + BUFFER);
        loadRange(loadedStart, newEnd);
      }
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
  }, [candles, chartRef, seriesRef, loadRange]);

  return { loadedRangeRef };
}
