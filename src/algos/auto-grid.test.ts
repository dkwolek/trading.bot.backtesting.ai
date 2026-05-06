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

  it('auto-size derives amountPerLevel from initialAmount and the session anchor', () => {
    // Anchor at $2000 with step $25 → 80 levels, amount = 10000/80 = $125.
    // No price action, so the anchor never moves and amount stays at $125
    // for the (one) fill that the seed candle produces.
    const seed = makeCandle(1700000000, 2000, 2000, 2000, 2000);
    const result = simulateAutoGrid([seed], {
      stepPrice: 25,
      amountPerLevel: 999, // ignored when autoSizeAmount is on
      autoSizeAmount: true,
      initialAmount: 10000,
    });
    expect(result.openPositionsAtEnd).toBe(1);
    expect(result.openPositionsCost).toBeCloseTo(125, 2);
  });

  it('auto-size shrinks amountPerLevel as the chase pushes the anchor up', () => {
    // Seed at $2000 fills L80. A wide candle reaching $2100 should
    // cascade chase L80→L81→L82→L83→L84. Each upward chase bumps the
    // session anchor and shrinks the per-level amount: $2000→$125,
    // $2025→$123.46, $2050→$121.95, $2075→$120.48, $2100→$119.05. The
    // final owned slot at L84 carries the smallest amount.
    const seed = makeCandle(1700000000, 2000, 2000, 2000, 2000);
    const climb = makeCandle(1700000060, 2025, 2100, 2025, 2100);
    const candles = [seed, climb];

    const result = simulateAutoGrid(candles, {
      stepPrice: 25,
      amountPerLevel: 999,
      autoSizeAmount: true,
      initialAmount: 10000,
    });
    expect(result.completedCycles).toBeGreaterThan(0);
    expect(result.openPositionsAtEnd).toBe(1);
    const lastSlot = result.lockedLevels[0];
    expect(lastSlot.level).toBe(2100);
    // Final entry uses the smallest amount: 10000 / 84.
    expect(result.openPositionsCost).toBeCloseTo(10000 / 84, 2);
  });

  it('monthly mode tops up freeCapital and rebuilds the grid each calendar month', () => {
    // Two calendar months at price 2000 (no price movement) — first
    // candle: initial deposit ($10k) seeds month 1 grid. First candle
    // of month 2 fires monthly contribution ($1000). monthlyResets
    // counts boundaries crossed AFTER the first month, so 1.
    // totalDeposited = 10000 + 1000 = 11000.
    const m1Start = Math.floor(new Date('2024-01-15T00:00:00Z').getTime() / 1000);
    const m1Mid = Math.floor(new Date('2024-01-25T00:00:00Z').getTime() / 1000);
    const m2Start = Math.floor(new Date('2024-02-05T00:00:00Z').getTime() / 1000);
    const candles: Candle[] = [
      makeCandle(m1Start, 2000, 2000, 2000, 2000),
      makeCandle(m1Mid, 2000, 2000, 2000, 2000),
      makeCandle(m2Start, 2000, 2000, 2000, 2000),
    ];

    const result = simulateAutoGrid(candles, {
      stepPrice: 25,
      amountPerLevel: 999,
      monthlyMode: true,
      monthlyAmount: 1000,
      monthlyRangePct: 50,
      initialAmount: 10000,
    });

    expect(result.monthlyResets).toBe(1);
    expect(result.totalDeposited).toBe(11000);
    expect(result.requiredCapitalActual).toBe(11000);
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
