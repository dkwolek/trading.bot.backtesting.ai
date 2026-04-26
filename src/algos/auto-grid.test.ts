import { describe, expect, it } from 'vitest';
import { Candle } from '../types/global.types';
import { simulateAutoGrid } from './auto-grid.algo';

// Hand-crafted candles to verify the simulation actually trades. Anchor
// the grid at $2500, then let price oscillate so we expect fills + TPs.
function makeCandle(time: number, open: number, high: number, low: number, close: number): Candle {
  return { time, open, high, low, close, volume: 1 };
}

describe('simulateAutoGrid', () => {
  it('produces fills and locked levels on a sloped market', () => {
    // Drift down monotonically from 2500 — every level filled, none recover.
    const candles: Candle[] = [];
    for (let index = 0; index < 100; index++) {
      const open = 2500 - index * 2;
      const close = open - 2;
      const low = close - 1;
      const high = open + 1;
      candles.push(makeCandle(1700000000 + index * 60, open, high, low, close));
    }
    const result = simulateAutoGrid(candles, {
      stepPrice: 25,
      amountPerLevel: 10,
    });
    expect(result.openPositionsAtEnd).toBeGreaterThan(0);
    expect(result.lockedLevels.length).toBe(result.openPositionsAtEnd);
    expect(result.maxCapitalDeployed).toBeGreaterThan(0);
  });

  it('cycles every level when price oscillates', () => {
    // Saw-tooth that crosses several grid levels both ways → cycles fire.
    const candles: Candle[] = [];
    for (let index = 0; index < 50; index++) {
      const isDown = index % 2 === 0;
      const open = isDown ? 2520 : 2480;
      const close = isDown ? 2480 : 2520;
      const low = 2475;
      const high = 2525;
      candles.push(makeCandle(1700000000 + index * 60, open, high, low, close));
    }
    const result = simulateAutoGrid(candles, {
      stepPrice: 25,
      amountPerLevel: 10,
    });
    expect(result.completedCycles).toBeGreaterThan(0);
    expect(result.totalProfit).toBeGreaterThan(0);
  });
});
