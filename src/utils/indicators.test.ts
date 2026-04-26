import { describe, expect, it } from 'vitest';
import { Candle } from '../types/global.types';
import { computeSMA } from './indicators';

function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, index) => ({
    time: index,
    open: close,
    high: close,
    low: close,
    close,
    volume: 0,
  }));
}

describe('computeSMA', () => {
  it('returns null for all indices before the period is reached', () => {
    const candles = makeCandles([1, 2, 3, 4, 5]);
    const result = computeSMA(candles, 3);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
  });

  it('returns the correct average once the period is reached', () => {
    const candles = makeCandles([1, 2, 3, 4, 5]);
    const result = computeSMA(candles, 3);
    expect(result[2]).toBe(2); // (1+2+3)/3
    expect(result[3]).toBe(3); // (2+3+4)/3
    expect(result[4]).toBe(4); // (3+4+5)/3
  });

  it('returns the value itself when period is 1', () => {
    const candles = makeCandles([5, 10, 15]);
    const result = computeSMA(candles, 1);
    expect(result).toEqual([5, 10, 15]);
  });

  it('returns an array of the same length as the input', () => {
    const candles = makeCandles([1, 2, 3, 4, 5]);
    const result = computeSMA(candles, 3);
    expect(result).toHaveLength(5);
  });

  it('returns all nulls when period exceeds the number of candles', () => {
    const candles = makeCandles([1, 2]);
    const result = computeSMA(candles, 5);
    expect(result).toEqual([null, null]);
  });

  it('uses only the closing price, not open/high/low', () => {
    const candles: Candle[] = [
      { time: 0, open: 100, high: 200, low: 50, close: 10, volume: 0 },
      { time: 1, open: 200, high: 300, low: 100, close: 20, volume: 0 },
    ];
    const result = computeSMA(candles, 2);
    expect(result[1]).toBe(15); // (10+20)/2
  });

  it('handles a period equal to the total number of candles', () => {
    const candles = makeCandles([2, 4, 6]);
    const result = computeSMA(candles, 3);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBe(4); // (2+4+6)/3
  });
});
