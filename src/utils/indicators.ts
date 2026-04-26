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
