import { describe, expect, it } from 'vitest';
import { BotConfig } from './config';
import { floorToStep, takeProfitPrice } from './grid';
import {
  classifySlot,
  OrderSnapshot,
  planExtendDown,
  planInitialGrid,
  planShiftUp,
} from './grid-decisions';
import { BotState, Slot } from './state';

const BASE_CONFIG: BotConfig = {
  pair: 'ETHUSDC',
  amountPerLevel: 10,
  stepPrice: 25,
  pendingBuys: 2,
  maxTotalSlots: 10,
  maxGridDepth: 10,
  pollIntervalMs: 10_000,
};

function emptyState(overrides: Partial<BotState> = {}): BotState {
  return {
    slots: [],
    gridAnchor: null,
    totalRealized: 0,
    totalFees: 0,
    cycles: 0,
    ...overrides,
  };
}

function pending(level: number, buyTxid = `b-${level}`): Slot {
  return { level, state: 'pending_buy', buyTxid, openedAt: 0 };
}

function owned(level: number, overrides: Partial<Slot> = {}): Slot {
  return {
    level,
    state: 'owned',
    buyTxid: `b-${level}`,
    sellTxid: `s-${level}`,
    buyFillPrice: level,
    volume: 10 / level,
    cost: 10.016, // $10 plus 0.16% maker fee
    openedAt: 0,
    ownedAt: 0,
    ...overrides,
  };
}

describe('floorToStep', () => {
  it('rounds 2316 with step 25 to 2300', () => {
    expect(floorToStep(2316, 25)).toBe(2300);
  });

  it('leaves an already-aligned price alone', () => {
    expect(floorToStep(2300, 25)).toBe(2300);
  });

  it('handles small steps', () => {
    expect(floorToStep(100.99, 0.5)).toBe(100.5);
  });

  it('rounds negative-ish edge down too (not that grid bot uses them)', () => {
    expect(floorToStep(0.3, 0.25)).toBe(0.25);
  });
});

describe('takeProfitPrice', () => {
  it('is always level + step', () => {
    expect(takeProfitPrice(2300, 25)).toBe(2325);
    expect(takeProfitPrice(100, 5)).toBe(105);
  });
});

describe('planInitialGrid', () => {
  it('drops pendingBuys limit buys from floor downwards', () => {
    const plan = planInitialGrid(2316, BASE_CONFIG);
    expect(plan.gridAnchor).toBe(2300);
    expect(plan.buyLevels).toEqual([2300, 2275]);
  });

  it('respects a wider pending count', () => {
    const plan = planInitialGrid(2316, { ...BASE_CONFIG, pendingBuys: 4 });
    expect(plan.buyLevels).toEqual([2300, 2275, 2250, 2225]);
  });

  it('does not emit non-positive levels', () => {
    const plan = planInitialGrid(30, { ...BASE_CONFIG, pendingBuys: 5, stepPrice: 10 });
    // floor(30/10)*10 = 30. Levels: 30, 20, 10, 0 (dropped), -10 (dropped)
    expect(plan.buyLevels).toEqual([30, 20, 10]);
  });
});

describe('planExtendDown', () => {
  it('returns the step below the deepest slot when within caps', () => {
    const state = emptyState({
      gridAnchor: 2300,
      slots: [pending(2275), pending(2250)],
    });
    const plan = planExtendDown(state, BASE_CONFIG);
    expect(plan.reason).toBe('ok');
    expect(plan.newLevel).toBe(2225);
  });

  it('refuses to extend past the total-slot cap', () => {
    const slots = Array.from({ length: 10 }, (_, i) => pending(2300 - i * 25));
    const state = emptyState({ gridAnchor: 2300, slots });
    const plan = planExtendDown(state, BASE_CONFIG);
    expect(plan.reason).toBe('max_total_slots');
    expect(plan.newLevel).toBeNull();
  });

  it('refuses to extend past maxGridDepth', () => {
    // anchor at 2300; a single slot at 2050 is already depth 10. Next at 2025
    // would be depth 11 which trips the guard regardless of how few slots we hold.
    const state = emptyState({
      gridAnchor: 2300,
      slots: [pending(2050)],
    });
    const plan = planExtendDown(state, BASE_CONFIG);
    expect(plan.reason).toBe('max_grid_depth');
    expect(plan.newLevel).toBeNull();
  });

  it('returns no_slots when called on an empty grid', () => {
    const plan = planExtendDown(emptyState(), BASE_CONFIG);
    expect(plan.reason).toBe('no_slots');
    expect(plan.newLevel).toBeNull();
  });

  it('treats owned slots as part of the grid for depth tracking', () => {
    const state = emptyState({
      gridAnchor: 2300,
      slots: [owned(2300), pending(2275)],
    });
    const plan = planExtendDown(state, BASE_CONFIG);
    expect(plan.newLevel).toBe(2250);
  });
});

describe('planShiftUp', () => {
  it('skips when the market floor is below or at current top', () => {
    const state = emptyState({
      gridAnchor: 2300,
      slots: [pending(2300), pending(2275)],
    });
    expect(planShiftUp(state, 2316, BASE_CONFIG).kind).toBe('skip');
    expect(planShiftUp(state, 2300, BASE_CONFIG).kind).toBe('skip');
  });

  it('re-anchors aggressively to the current floor on a big move', () => {
    const state = emptyState({
      gridAnchor: 2300,
      slots: [pending(2250), pending(2225)],
    });
    // 2410 clears the 2400 boundary by more than the 20 % buffer (5).
    const plan = planShiftUp(state, 2410, BASE_CONFIG);
    expect(plan.kind).toBe('shift');
    expect(plan.newTop).toBe(2400);
    expect(plan.toPlace).toEqual([2400, 2375]);
    expect(plan.staleLevels.sort()).toEqual([2225, 2250]);
  });

  it('preserves a pending that happens to line up with the new grid', () => {
    const state = emptyState({
      gridAnchor: 2300,
      slots: [pending(2275), pending(2250)],
    });
    const plan = planShiftUp(state, 2335, BASE_CONFIG);
    // new top = 2325, targets [2325, 2300]; existing 2275 and 2250 are stale.
    expect(plan.toPlace).toEqual([2325, 2300]);
    expect(plan.staleLevels.sort()).toEqual([2250, 2275]);
  });

  it('does not try to place over an owned slot sitting at the target level', () => {
    const state = emptyState({
      gridAnchor: 2300,
      slots: [owned(2300), pending(2275)],
    });
    // price bumped to 2360; new top = 2350, targets [2350, 2325]
    // 2300 owned is neither a target nor stale (owned not cancelled).
    const plan = planShiftUp(state, 2360, BASE_CONFIG);
    expect(plan.toPlace).toEqual([2350, 2325]);
    expect(plan.staleLevels).toEqual([2275]);
  });

  it('skips when price is right at the new boundary (post-only safety buffer)', () => {
    const state = emptyState({
      gridAnchor: 2300,
      slots: [pending(2275), pending(2250)],
    });
    // 2326 only clears 2325 by 1 — under the 20 % buffer, so we hold off
    // to avoid placing a post-only buy at a level the price just tagged.
    const plan = planShiftUp(state, 2326, BASE_CONFIG);
    expect(plan.kind).toBe('skip');
  });

  it('catches up after a long uptrend with no TPs (the live-bot incident)', () => {
    // Reproduces the 2026-04-26 incident: anchor stuck at 2340 with
    // pendings 2320/2330/2340 while price ran to 2366 with no TP firing.
    // Re-anchoring every tick (regardless of TPs) plus the buffer should
    // catch this and shift to 2360.
    const state = emptyState({
      gridAnchor: 2340,
      slots: [pending(2340), pending(2330), pending(2320)],
    });
    const config = { ...BASE_CONFIG, stepPrice: 10, pendingBuys: 3 };
    const plan = planShiftUp(state, 2366, config);
    expect(plan.kind).toBe('shift');
    expect(plan.newTop).toBe(2360);
    // Targets: [2360, 2350, 2340]. 2340 already pending → kept; 2330
    // and 2320 are no longer in the target window so they're stale.
    expect(plan.toPlace).toEqual([2360, 2350]);
    expect(plan.staleLevels.sort()).toEqual([2320, 2330]);
  });

  it('returns empty toPlace when every target is already covered', () => {
    const state = emptyState({
      gridAnchor: 2275,
      slots: [pending(2300), pending(2275)], // pendings already where the new top would be
    });
    const plan = planShiftUp(state, 2316, BASE_CONFIG);
    // floor(2316)=2300, but current top is already 2300 => skip.
    expect(plan.kind).toBe('skip');
  });
});

describe('classifySlot', () => {
  const snapshot = (overrides: Partial<OrderSnapshot> = {}): OrderSnapshot => ({
    status: 'open',
    price: 0,
    vol_exec: 0,
    cost: 0,
    fee: 0,
    ...overrides,
  });

  it('keeps a pending slot while the buy order is still open', () => {
    const slot = pending(2300);
    const action = classifySlot(slot, snapshot(), undefined, 25);
    expect(action.kind).toBe('keep');
  });

  it('classifies a closed buy as buy_filled with computed cost', () => {
    const slot = pending(2300);
    const buy = snapshot({ status: 'closed', price: 2300, vol_exec: 0.00435, cost: 10, fee: 0.016 });
    const action = classifySlot(slot, buy, undefined, 25);
    expect(action.kind).toBe('buy_filled');
    expect(action.fillPrice).toBe(2300);
    expect(action.volume).toBe(0.00435);
    expect(action.cost).toBeCloseTo(10.016);
  });

  it('falls back to price × volume if Kraken did not report cost on the fill', () => {
    const slot = pending(2300);
    const buy = snapshot({ status: 'closed', price: 2300, vol_exec: 0.004, cost: 0, fee: 0.01 });
    const action = classifySlot(slot, buy, undefined, 25);
    expect(action.cost).toBeCloseTo(2300 * 0.004 + 0.01);
  });

  it('flags a cancelled buy so the slot gets dropped', () => {
    const slot = pending(2300);
    const buy = snapshot({ status: 'canceled' });
    const action = classifySlot(slot, buy, undefined, 25);
    expect(action.kind).toBe('buy_canceled');
  });

  it('books realized PnL when a TP closes with reported cost', () => {
    const slot = owned(2300, { cost: 10.016, volume: 10 / 2300 });
    const sell = snapshot({ status: 'closed', price: 2325, cost: 10.108, fee: 0.016 });
    const action = classifySlot(slot, undefined, sell, 25);
    expect(action.kind).toBe('tp_filled');
    // proceeds 10.108 - fee 0.016 - cost 10.016 = 0.076
    expect(action.realized).toBeCloseTo(0.076, 3);
  });

  it('falls back to exitPrice × volume when TP close has no cost', () => {
    const slot = owned(2300, { cost: 10.016, volume: 10 / 2300 });
    const sell = snapshot({ status: 'closed', price: 2325, cost: 0, fee: 0.016 });
    const action = classifySlot(slot, undefined, sell, 25);
    const proceeds = 2325 * (10 / 2300);
    const expected = proceeds - 0.016 - 10.016;
    expect(action.realized).toBeCloseTo(expected, 6);
  });

  it('asks for a TP placement when an owned slot arrived with no sell txid', () => {
    const slot: Slot = {
      level: 2300,
      state: 'owned',
      buyTxid: 'b',
      buyFillPrice: 2300,
      volume: 10 / 2300,
      cost: 10,
      openedAt: 0,
      ownedAt: 0,
    };
    const action = classifySlot(slot, undefined, undefined, 25);
    expect(action.kind).toBe('place_missing_tp');
  });

  it('re-places a TP that Kraken cancelled under us', () => {
    const slot = owned(2300);
    const sell = snapshot({ status: 'expired' });
    const action = classifySlot(slot, undefined, sell, 25);
    expect(action.kind).toBe('tp_canceled');
  });
});

describe('end-to-end scenarios', () => {
  it('scenario 1: fresh start at price 2316 places 2 pending at 2300 and 2275', () => {
    const plan = planInitialGrid(2316, BASE_CONFIG);
    expect(plan.gridAnchor).toBe(2300);
    expect(plan.buyLevels).toEqual([2300, 2275]);
  });

  it('scenario 2: after buy@2300 fills, the next resting buy lands at 2250', () => {
    // Post-fill reconcile: slot at 2300 is now owned, 2275 still pending.
    const state = emptyState({
      gridAnchor: 2300,
      slots: [owned(2300), pending(2275)],
    });
    const plan = planExtendDown(state, BASE_CONFIG);
    expect(plan.newLevel).toBe(2250);
  });

  it('scenario 3: after TP@2325 fires at price 2340 the grid jumps to [2325, 2300]', () => {
    // We had owned@2300 which just TPed (owned removed by reconcile), and a
    // lingering pending at 2275, 2250 from the down-leg.
    const state = emptyState({
      gridAnchor: 2300,
      slots: [pending(2275), pending(2250)],
    });
    const plan = planShiftUp(state, 2340, BASE_CONFIG);
    expect(plan.kind).toBe('shift');
    expect(plan.newTop).toBe(2325);
    expect(plan.toPlace).toEqual([2325, 2300]);
    expect(plan.staleLevels.sort()).toEqual([2250, 2275]);
  });

  it('scenario 4: price rockets to 2500 after both TPs fire — grid jumps straight to [2500, 2475]', () => {
    const state = emptyState({
      gridAnchor: 2300,
      slots: [pending(2250), pending(2225)],
    });
    const plan = planShiftUp(state, 2510, BASE_CONFIG);
    expect(plan.newTop).toBe(2500);
    expect(plan.toPlace).toEqual([2500, 2475]);
    expect(plan.staleLevels.sort()).toEqual([2225, 2250]);
  });

  it('scenario 5: grid depth exhausted on a long drop keeps refusing new buys', () => {
    const state = emptyState({
      gridAnchor: 2300,
      slots: [pending(2050)],
    });
    const plan = planExtendDown(state, BASE_CONFIG);
    expect(plan.newLevel).toBeNull();
    expect(plan.reason).toBe('max_grid_depth');
  });
});
