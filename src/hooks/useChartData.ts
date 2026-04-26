import { useState } from 'react';
import {
  DataSource,
  Interval,
  Mode,
  Pair,
  PAIR_DATA_SOURCE,
  Period,
} from '../constants/global.constants';
import { Candle } from '../types/global.types';
import { fetchKlines } from '../services/binance';
import { fetchYahooKlines } from '../services/yahoo';
import {
  getCachedCandles,
  mergeCandles,
  findMissingRanges,
  sliceCandles,
} from '../services/candle-cache';

const PERIOD_TO_MS: Record<Period, number> = {
  [Period.ONE_DAY]: 1 * 86_400_000,
  [Period.THREE_DAYS]: 3 * 86_400_000,
  [Period.SEVEN_DAYS]: 7 * 86_400_000,
  [Period.FOURTEEN_DAYS]: 14 * 86_400_000,
  [Period.THIRTY_DAYS]: 30 * 86_400_000,
  [Period.TWO_MONTHS]: 60 * 86_400_000,
  [Period.THREE_MONTHS]: 90 * 86_400_000,
  [Period.SIX_MONTHS]: 180 * 86_400_000,
  [Period.TWELVE_MONTHS]: 365 * 86_400_000,
  [Period.TWENTY_FOUR_MONTHS]: 730 * 86_400_000,
  [Period.THIRTY_SIX_MONTHS]: 1095 * 86_400_000,
  [Period.FORTY_EIGHT_MONTHS]: 1461 * 86_400_000,
};

interface ChartDataState {
  candles: Candle[];
  isLoading: boolean;
  progress: number;
  error: string | null;
  loadData: () => void;
}

export function useChartData(
  mode: Mode,
  selectedPair: Pair,
  selectedPeriod: Period,
  selectedInterval: Interval,
  endDate: Date | null
): ChartDataState {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      const endTime = endDate ? endDate.getTime() : Date.now();
      const startTime = endTime - PERIOD_TO_MS[selectedPeriod];

      const cached = await getCachedCandles(selectedPair, selectedInterval);
      const gaps = findMissingRanges(cached, startTime, endTime);

      if (gaps.length === 0) {
        // Fully cached
        setCandles(sliceCandles(cached, startTime, endTime));
        setProgress(100);
      } else {
        // Fetch only missing gaps
        const source = PAIR_DATA_SOURCE[selectedPair];
        const fetcher = source === DataSource.Yahoo ? fetchYahooKlines : fetchKlines;
        let allFetched: Candle[] = [];

        for (let index = 0; index < gaps.length; index++) {
          const gap = gaps[index];
          const gapEnd = new Date(gap.fetchEnd);
          const gapPeriod = findClosestPeriod(gap.fetchEnd - gap.fetchStart);

          const fetched = await fetcher(
            selectedPair,
            gapPeriod,
            selectedInterval,
            (pct) => {
              const gapWeight = 1 / gaps.length;
              setProgress(Math.round((index * gapWeight + (pct * gapWeight) / 100) * 100));
            },
            gapEnd
          );
          allFetched = allFetched.concat(fetched);
        }

        const merged = await mergeCandles(selectedPair, selectedInterval, allFetched);
        setCandles(sliceCandles(merged, startTime, endTime));
        setProgress(100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  return { candles, isLoading, progress, error, loadData };
}

/**
 * Finds the smallest period that covers the given duration in milliseconds.
 */
function findClosestPeriod(durationMs: number): Period {
  const periods = Object.entries(PERIOD_TO_MS) as [Period, number][];
  const sorted = periods.sort((entryA, entryB) => entryA[1] - entryB[1]);
  for (const [period, ms] of sorted) {
    if (ms >= durationMs) {
      return period;
    }
  }
  return sorted[sorted.length - 1][0];
}
