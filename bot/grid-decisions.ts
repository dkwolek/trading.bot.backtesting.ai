import { BotConfig } from './config';
import { floorToStep, takeProfitPrice } from './grid';
import { BotState, Slot } from './state';

export interface InitialGridPlan {
  gridAnchor: number;
  buyLevels: number[];
}

/**
 * Cold-start plan: anchor at `floor(price/step)*step` and lay a chain of
 * resting buys going down from there, one per `pendingBuys` slot.
 */
export function planInitialGrid(price: number, config: BotConfig): InitialGridPlan {
  const anchor = floorToStep(price, config.stepPrice);
  const levels: number[] = [];
  for (let index = 0; index < config.pendingBuys; index++) {
    const level = anchor - index * config.stepPrice;
    if (level > 0) {
      levels.push(level);
    }
  }
  return { gridAnchor: anchor, buyLevels: levels };
}

export type ExtendDownReason = 'ok' | 'no_slots' | 'max_total_slots' | 'max_grid_depth';

export interface ExtendDownPlan {
  newLevel: number | null;
  reason: ExtendDownReason;
}

/**
 * Post-fill: which level, if any, should the next resting buy go at?
 * Honors both `maxTotalSlots` (budget cap) and `maxGridDepth` (distance
 * from the original anchor) so a runaway market can't keep us opening
 * buys forever.
 */
export function planExtendDown(state: BotState, config: BotConfig): ExtendDownPlan {
  if (state.slots.length >= config.maxTotalSlots) {
    return { newLevel: null, reason: 'max_total_slots' };
  }
  if (state.slots.length === 0) {
    return { newLevel: null, reason: 'no_slots' };
  }
  let bottom = Number.POSITIVE_INFINITY;
  for (const slot of state.slots) {
    if (slot.level < bottom) {
      bottom = slot.level;
    }
  }
  const newLevel = bottom - config.stepPrice;
  if (state.gridAnchor !== null) {
    const depth = Math.round((state.gridAnchor - newLevel) / config.stepPrice);
    if (depth > config.maxGridDepth) {
      return { newLevel: null, reason: 'max_grid_depth' };
    }
  }
  return { newLevel, reason: 'ok' };
}

export type ShiftUpKind = 'skip' | 'shift';

export interface ShiftUpPlan {
  kind: ShiftUpKind;
  newTop: number | null;
  toPlace: number[];
  staleLevels: number[];
}

// Require the price to clear the new step boundary by this fraction of a
// step before shifting up. Without it, a price hovering right around
// `newTop` triggers shift after shift only to have the post-only buy at
// `newTop` rejected (price tags the level → would take liquidity).
const SHIFT_UP_BUFFER_FRACTION = 0.2;

/**
 * Post-TP: work out the new grid top (= current price's floor) and which
 * resting buy levels to place / cancel. Caller still has to do the
 * atomic-ish placement dance — this just answers "where should the grid
 * be after the TPs fired?".
 */
export function planShiftUp(state: BotState, price: number, config: BotConfig): ShiftUpPlan {
  const newTop = floorToStep(price, config.stepPrice);
  let currentTop: number | null = null;
  for (const slot of state.slots) {
    if (slot.state === 'pending_buy' && (currentTop === null || slot.level > currentTop)) {
      currentTop = slot.level;
    }
  }
  const effectiveCurrent = currentTop ?? state.gridAnchor ?? newTop;
  if (newTop <= effectiveCurrent) {
    return { kind: 'skip', newTop: null, toPlace: [], staleLevels: [] };
  }
  // Hold off until price clears the new boundary by a margin so the
  // post-only buy we'd place at `newTop` doesn't get rejected for
  // tagging the touch.
  if (price - newTop < config.stepPrice * SHIFT_UP_BUFFER_FRACTION) {
    return { kind: 'skip', newTop: null, toPlace: [], staleLevels: [] };
  }

  const targets: number[] = [];
  for (let index = 0; index < config.pendingBuys; index++) {
    const level = newTop - index * config.stepPrice;
    if (level > 0) {
      targets.push(level);
    }
  }
  const targetSet = new Set(targets);
  const occupied = new Set(state.slots.map((slot) => slot.level));
  const toPlace = targets.filter((level) => !occupied.has(level));
  const staleLevels: number[] = [];
  for (const slot of state.slots) {
    if (slot.state === 'pending_buy' && !targetSet.has(slot.level)) {
      staleLevels.push(slot.level);
    }
  }
  return { kind: 'shift', newTop, toPlace, staleLevels };
}

export interface ReconcileFill {
  fillPrice: number;
  volume: number;
  cost: number; // quote cost including any fee Kraken reported
  fee: number; // quote fee
}

export interface OrderSnapshot {
  status: 'pending' | 'open' | 'closed' | 'canceled' | 'expired' | 'triggered';
  price: number;
  vol_exec: number;
  cost: number;
  fee: number;
}

export interface ReconcileSlotAction {
  kind:
    | 'keep'
    | 'buy_filled'
    | 'buy_canceled'
    | 'tp_filled'
    | 'tp_canceled'
    | 'place_missing_tp';
  slot: Slot;
  fillPrice?: number;
  volume?: number;
  cost?: number;
  fee?: number;
  realized?: number;
}

/**
 * Pure classifier for one slot against its order statuses: decides what to
 * do with the slot given the state of its buy (and optional sell) orders.
 * The caller handles the side effects (placing TP sells, cancelling,
 * updating totals).
 */
export function classifySlot(
  slot: Slot,
  buyOrder: OrderSnapshot | undefined,
  sellOrder: OrderSnapshot | undefined,
  stepPrice: number
): ReconcileSlotAction {
  if (slot.state === 'pending_buy') {
    if (!buyOrder) {
      return { kind: 'keep', slot };
    }
    if (buyOrder.status === 'closed') {
      const fillPrice = buyOrder.price;
      const volume = buyOrder.vol_exec;
      const fee = buyOrder.fee;
      const cost =
        buyOrder.cost > 0 ? buyOrder.cost + fee : fillPrice * volume + fee;
      return {
        kind: 'buy_filled',
        slot,
        fillPrice,
        volume,
        cost,
        fee,
      };
    }
    if (buyOrder.status === 'canceled' || buyOrder.status === 'expired') {
      return { kind: 'buy_canceled', slot };
    }
    return { kind: 'keep', slot };
  }

  // slot.state === 'owned'
  if (!slot.sellTxid) {
    return { kind: 'place_missing_tp', slot };
  }
  if (!sellOrder) {
    return { kind: 'keep', slot };
  }
  if (sellOrder.status === 'closed') {
    const exitPrice = sellOrder.price;
    const fee = sellOrder.fee;
    const proceeds =
      sellOrder.cost > 0 ? sellOrder.cost : exitPrice * (slot.volume ?? 0);
    const realized = proceeds - fee - (slot.cost ?? 0);
    return {
      kind: 'tp_filled',
      slot,
      fillPrice: exitPrice,
      fee,
      realized,
    };
  }
  if (sellOrder.status === 'canceled' || sellOrder.status === 'expired') {
    return { kind: 'tp_canceled', slot };
  }
  return { kind: 'keep', slot };
}

/**
 * Sanity utility used by both the runtime and tests: reproduce the
 * configured TP price for a slot without pulling in the whole bot.
 */
export function expectedTakeProfit(slot: Slot, stepPrice: number): number {
  return takeProfitPrice(slot.level, stepPrice);
}
