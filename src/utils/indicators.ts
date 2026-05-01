import { Candle } from '../types/global.types';

/**
 * Computes the Simple Moving Average for a series of candles.
 * Returns null for indices where there aren't enough preceding candles.
 */
export function computeSMA(candles: Candle[], period: number): (number | null)[] {
  return candles.map((_, index) => {
    if (index < period - 1) {
      return null;
    }
    const window = candles.slice(index - period + 1, index + 1);
    const sum = window.reduce((total, candle) => total + candle.close, 0);
    return sum / period;
  });
}

/**
 * Average True Range over `period` candles using a simple moving
 * average of true ranges. True range for candle i = max(high-low,
 * |high - prevClose|, |low - prevClose|). Returns null until enough
 * history is accumulated.
 */
export function computeATR(candles: Candle[], period: number): (number | null)[] {
  if (period <= 0 || candles.length === 0) {
    return candles.map(() => null);
  }
  const trueRanges: number[] = [];
  for (let index = 0; index < candles.length; index++) {
    const candle = candles[index];
    if (index === 0) {
      trueRanges.push(candle.high - candle.low);
      continue;
    }
    const prevClose = candles[index - 1].close;
    const range = Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - prevClose),
      Math.abs(candle.low - prevClose)
    );
    trueRanges.push(range);
  }
  const result: (number | null)[] = candles.map(() => null);
  if (candles.length < period) {
    return result;
  }
  let sum = 0;
  for (let index = 0; index < period; index++) {
    sum += trueRanges[index];
  }
  result[period - 1] = sum / period;
  for (let index = period; index < candles.length; index++) {
    sum += trueRanges[index] - trueRanges[index - period];
    result[index] = sum / period;
  }
  return result;
}

/**
 * Mean of the non-null ATR values over the dataset — returns null when
 * the series is shorter than `period`. Used by the volatility-adaptive
 * grid to size step once over the whole backtest.
 */
export function meanATR(candles: Candle[], period: number): number | null {
  const series = computeATR(candles, period);
  let sum = 0;
  let count = 0;
  for (const value of series) {
    if (value !== null) {
      sum += value;
      count += 1;
    }
  }
  if (count === 0) {
    return null;
  }
  return sum / count;
}
