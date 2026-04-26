import { Interval, Pair, Period } from '../constants/global.constants';
import { Candle } from '../types/global.types';

const BASE_URL = '/yahoo/v8/finance/chart';

const INTERVAL_MAP: Record<Interval, string> = {
  [Interval.ONE_MINUTE]: '1m',
  [Interval.FIVE_MINUTES]: '5m',
  [Interval.FIFTEEN_MINUTES]: '15m',
  [Interval.ONE_HOUR]: '1h',
  [Interval.FOUR_HOURS]: '1h',
  [Interval.ONE_DAY]: '1d',
};

const PERIOD_TO_SECONDS: Record<Period, number> = {
  [Period.ONE_DAY]: 86_400,
  [Period.THREE_DAYS]: 3 * 86_400,
  [Period.SEVEN_DAYS]: 7 * 86_400,
  [Period.FOURTEEN_DAYS]: 14 * 86_400,
  [Period.THIRTY_DAYS]: 30 * 86_400,
  [Period.TWO_MONTHS]: 60 * 86_400,
  [Period.THREE_MONTHS]: 90 * 86_400,
  [Period.SIX_MONTHS]: 180 * 86_400,
  [Period.TWELVE_MONTHS]: 365 * 86_400,
  [Period.TWENTY_FOUR_MONTHS]: 730 * 86_400,
  [Period.THIRTY_SIX_MONTHS]: 1095 * 86_400,
  [Period.FORTY_EIGHT_MONTHS]: 1461 * 86_400,
};

interface YahooChartResult {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
    error: { code: string; description: string } | null;
  };
}

// Yahoo limits: 1m/5m max 7d, 15m max 60d, 1h max 730d, 1d unlimited
function clampInterval(interval: string, periodSeconds: number): string {
  const days = periodSeconds / 86_400;
  if (days <= 7) {
    return interval;
  }
  if (days <= 60) {
    const minInterval = ['1m', '5m'].includes(interval) ? '15m' : interval;
    return minInterval;
  }
  if (days <= 730) {
    const hourlyOrHigher = ['1m', '5m', '15m'].includes(interval) ? '1h' : interval;
    return hourlyOrHigher;
  }
  return '1d';
}

function pairToSymbol(pair: string): string {
  // SPY/USD -> SPY
  return pair.split('/')[0];
}

export async function fetchYahooKlines(
  pair: Pair,
  period: Period,
  interval: Interval,
  onProgress?: (percent: number) => void,
  endDate?: Date | null
): Promise<Candle[]> {
  const symbol = pairToSymbol(pair);
  const yahooInterval = INTERVAL_MAP[interval];
  const periodSeconds = PERIOD_TO_SECONDS[period];

  const endTimestamp = endDate
    ? Math.floor(endDate.getTime() / 1000)
    : Math.floor(Date.now() / 1000);
  const startTimestamp = endTimestamp - periodSeconds;

  const clampedInterval = clampInterval(yahooInterval, periodSeconds);
  onProgress?.(10);

  const url = `${BASE_URL}/${symbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=${clampedInterval}&includePrePost=false`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }

  const data: YahooChartResult = await response.json();

  if (data.chart.error) {
    throw new Error(`Yahoo: ${data.chart.error.description}`);
  }

  const result = data.chart.result[0];
  if (!result || !result.timestamp) {
    throw new Error('Yahoo: No data returned');
  }

  onProgress?.(50);

  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];
  const candles: Candle[] = [];

  for (let index = 0; index < timestamps.length; index++) {
    const open = quote.open[index];
    const high = quote.high[index];
    const low = quote.low[index];
    const close = quote.close[index];
    const volume = quote.volume[index];

    if (open === null || high === null || low === null || close === null) {
      continue;
    }

    candles.push({
      time: timestamps[index],
      open,
      high,
      low,
      close,
      volume: volume ?? 0,
    });
  }

  onProgress?.(100);
  return candles;
}
