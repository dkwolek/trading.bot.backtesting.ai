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

  it('vol-adaptive step overrides manual step with ATR × multiplier', () => {
    // Saw-tooth with predictable true range so we can pin the expected
    // step. Highs and lows are 20 apart on every candle and there's
    // no gap between closes, so TR ≈ high − low = 20 for every candle.
    // mean ATR(14) = 20, multiplier 0.5 → effective step = 10.
    const candles: Candle[] = [];
    for (let index = 0; index < 50; index++) {
      const isDown = index % 2 === 0;
      const close = isDown ? 2490 : 2510;
      const open = close;
      const low = close - 10;
      const high = close + 10;
      candles.push(makeCandle(1700000000 + index * 60, open, high, low, close));
    }
    const result = simulateAutoGrid(candles, {
      stepPrice: 999, // ignored
      amountPerLevel: 10,
      volAdaptiveStep: true,
      atrPeriod: 14,
      atrMultiplier: 0.5,
    });
    expect(result.effectiveStepPrice).toBeGreaterThan(0);
    expect(result.effectiveStepPrice).toBeLessThan(50);
    expect(result.effectiveStepPrice).not.toBe(999);
  });

  it('chase-after-tp cascades multiple cycles in a single uptrend candle', () => {
    // Seed candle at $90 fills L9. The climb candle opens at $100 (no
    // dip back to $90) and reaches $200 — chase cascades L9→L10→...→L19
    // in one TP-loop pass, ending owned at L20 with 11 closed cycles.
    // Chase is now always on so the assertion just pins the cascade
    // count + final bag.
    const seed = makeCandle(1700000000, 90, 90, 90, 90);
    const climb = makeCandle(1700000060, 100, 200, 100, 200);
    const candles = [seed, climb];

    const result = simulateAutoGrid(candles, {
      stepPrice: 10,
      amountPerLevel: 10,
    });

    expect(result.completedCycles).toBe(11);
    expect(result.totalProfit).toBeGreaterThan(0);
    expect(result.openPositionsAtEnd).toBe(1);
    expect(result.lockedLevels[0].level).toBe(200);
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
