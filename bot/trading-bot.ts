import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as log from './logger';
import { cancelOrder, getTicker, placeLimit, queryOrders } from './kraken-api';
import { BotConfig, loadConfig, validateConfig } from './config';
import { takeProfitPrice } from './grid';
import {
  planExtendDown,
  planInitialGrid,
  planShiftUp,
} from './grid-decisions';
import { BotState, Slot, loadState, saveState } from './state';

const DIR = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(DIR, '.env') });

const apiKey = process.env.KRAKEN_API_KEY ?? '';
const apiSecret = process.env.KRAKEN_API_SECRET ?? '';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pendingSlots(state: BotState): Slot[] {
  return state.slots.filter((slot) => slot.state === 'pending_buy');
}

function ownedSlots(state: BotState): Slot[] {
  return state.slots.filter((slot) => slot.state === 'owned');
}

function minLevel(slots: Slot[]): number | null {
  if (slots.length === 0) {
    return null;
  }
  let min = Number.POSITIVE_INFINITY;
  for (const slot of slots) {
    if (slot.level < min) {
      min = slot.level;
    }
  }
  return min;
}

function maxLevel(slots: Slot[]): number | null {
  if (slots.length === 0) {
    return null;
  }
  let max = Number.NEGATIVE_INFINITY;
  for (const slot of slots) {
    if (slot.level > max) {
      max = slot.level;
    }
  }
  return max;
}

async function placeBuyOrder(
  level: number,
  amountPerLevel: number,
  pair: string
): Promise<string | null> {
  const volume = (amountPerLevel / level).toFixed(8);
  try {
    const txids = await placeLimit(
      apiKey,
      apiSecret,
      pair,
      'buy',
      volume,
      level.toFixed(2),
      0,
      false,
      true
    );
    log.success(`Placed limit buy ${volume} @ ${level.toFixed(2)} [post-only] (txid ${txids[0]})`);
    return txids[0];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn(`Buy @ ${level.toFixed(2)} rejected: ${message}`);
    return null;
  }
}

async function placeSellOrder(slot: Slot, stepPrice: number, pair: string): Promise<string | null> {
  const tpPrice = takeProfitPrice(slot.level, stepPrice);
  const volume = slot.volume?.toFixed(8) ?? '0';
  try {
    const txids = await placeLimit(
      apiKey,
      apiSecret,
      pair,
      'sell',
      volume,
      tpPrice.toFixed(2),
      0,
      false,
      true
    );
    log.success(
      `Placed TP sell ${volume} @ ${tpPrice.toFixed(2)} [post-only] for level ${slot.level.toFixed(2)} (txid ${txids[0]})`
    );
    return txids[0];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn(`TP @ ${tpPrice.toFixed(2)} rejected: ${message}`);
    return null;
  }
}

async function cancelSafely(txid: string, labelForLog: string): Promise<void> {
  try {
    await cancelOrder(apiKey, apiSecret, txid);
    log.info(`Cancelled ${labelForLog} (txid ${txid})`);
  } catch (error) {
    log.warn(
      `cancelOrder ${txid} failed (${labelForLog}): ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

interface TickEvents {
  fills: number; // how many buys filled this tick
  tps: number; // how many TPs fired this tick
}

async function reconcileSlots(state: BotState, config: BotConfig): Promise<TickEvents> {
  const events: TickEvents = { fills: 0, tps: 0 };
  const txids: string[] = [];
  for (const slot of state.slots) {
    txids.push(slot.buyTxid);
    if (slot.sellTxid) {
      txids.push(slot.sellTxid);
    }
  }
  if (txids.length === 0) {
    return events;
  }
  const orders = await queryOrders(apiKey, apiSecret, txids);
  const remaining: Slot[] = [];
  for (const slot of state.slots) {
    if (slot.state === 'pending_buy') {
      const buyOrder = orders[slot.buyTxid];
      if (!buyOrder) {
        remaining.push(slot);
        continue;
      }
      if (buyOrder.status === 'closed') {
        const fillPrice = parseFloat(buyOrder.price);
        const volume = parseFloat(buyOrder.vol_exec);
        const cost = parseFloat(buyOrder.cost ?? '0');
        const fee = parseFloat(buyOrder.fee ?? '0');
        state.totalFees += fee;
        const updated: Slot = {
          ...slot,
          state: 'owned',
          buyFillPrice: fillPrice,
          volume,
          cost: cost > 0 ? cost + fee : fillPrice * volume + fee,
          ownedAt: Date.now(),
        };
        log.success(
          `Buy filled -- level ${slot.level.toFixed(2)} at ${fillPrice.toFixed(2)}, vol ${volume} (fee $${fee.toFixed(4)})`
        );
        const sellTxid = await placeSellOrder(updated, config.stepPrice, config.pair);
        if (sellTxid) {
          updated.sellTxid = sellTxid;
        }
        remaining.push(updated);
        events.fills += 1;
      } else if (buyOrder.status === 'canceled' || buyOrder.status === 'expired') {
        log.warn(
          `Buy ${slot.buyTxid} ${buyOrder.status} -- dropping slot at level ${slot.level.toFixed(2)}`
        );
      } else {
        remaining.push(slot);
      }
      continue;
    }

    if (!slot.sellTxid) {
      const sellTxid = await placeSellOrder(slot, config.stepPrice, config.pair);
      remaining.push(sellTxid ? { ...slot, sellTxid } : slot);
      continue;
    }
    const sellOrder = orders[slot.sellTxid];
    if (!sellOrder) {
      remaining.push(slot);
      continue;
    }
    if (sellOrder.status === 'closed') {
      const proceeds = parseFloat(sellOrder.cost ?? '0');
      const fee = parseFloat(sellOrder.fee ?? '0');
      const exitPrice = parseFloat(sellOrder.price);
      const netProceeds = (proceeds > 0 ? proceeds : exitPrice * (slot.volume ?? 0)) - fee;
      const realized = netProceeds - (slot.cost ?? 0);
      state.totalRealized += realized;
      state.totalFees += fee;
      state.cycles += 1;
      log.success(
        `TP filled -- level ${slot.level.toFixed(2)} at ${exitPrice.toFixed(2)} -> PnL $${realized.toFixed(4)} (fee $${fee.toFixed(4)})`
      );
      events.tps += 1;
    } else if (sellOrder.status === 'canceled' || sellOrder.status === 'expired') {
      log.warn(
        `TP ${slot.sellTxid} ${sellOrder.status} -- re-placing for level ${slot.level.toFixed(2)}`
      );
      const newSellTxid = await placeSellOrder(slot, config.stepPrice, config.pair);
      remaining.push(newSellTxid ? { ...slot, sellTxid: newSellTxid } : slot);
    } else {
      remaining.push(slot);
    }
  }
  state.slots = remaining;
  return events;
}

/**
 * Post-fill: drop a new resting buy one step below the current deepest
 * slot. Delegates the decision (respecting maxTotalSlots and maxGridDepth)
 * to the pure planner in grid-decisions.ts and executes if it says ok.
 */
async function extendDown(state: BotState, config: BotConfig): Promise<boolean> {
  const plan = planExtendDown(state, config);
  if (plan.newLevel === null) {
    if (plan.reason === 'max_total_slots') {
      log.info(`maxTotalSlots ${config.maxTotalSlots} reached -- not adding deeper level`);
    } else if (plan.reason === 'max_grid_depth') {
      log.info(`Grid depth > ${config.maxGridDepth} -- not adding deeper level`);
    }
    return false;
  }
  const txid = await placeBuyOrder(plan.newLevel, config.amountPerLevel, config.pair);
  if (!txid) {
    return false;
  }
  state.slots.push({
    level: plan.newLevel,
    state: 'pending_buy',
    buyTxid: txid,
    openedAt: Date.now(),
  });
  return true;
}

/**
 * Post-TP: re-anchor the grid directly to `floor(price/step)*step` instead
 * of crawling up one step at a time — otherwise a fills-then-TPs cycle
 * leaves the grid back where it started while the market has long since
 * moved. We place every new target buy first and only cancel stale
 * pendings after they've all succeeded; any post-only reject rolls back
 * the partial placements and leaves the old grid intact.
 */
async function shiftUp(state: BotState, config: BotConfig, price: number): Promise<boolean> {
  const plan = planShiftUp(state, price, config);
  if (plan.kind === 'skip' || plan.newTop === null) {
    return false;
  }
  if (plan.toPlace.length === 0) {
    state.gridAnchor = Math.max(state.gridAnchor ?? plan.newTop, plan.newTop);
    return true;
  }

  // Atomic-ish: try all new placements first; if any post-only rejects,
  // undo the ones already placed and bail without touching stale pendings.
  const placed: Slot[] = [];
  for (const level of plan.toPlace) {
    const txid = await placeBuyOrder(level, config.amountPerLevel, config.pair);
    if (!txid) {
      for (const slot of placed) {
        await cancelSafely(slot.buyTxid, `shiftUp rollback @ ${slot.level.toFixed(2)}`);
      }
      log.info(
        `shiftUp to ${plan.newTop.toFixed(2)} aborted -- post-only rejected at ${level.toFixed(2)}`
      );
      return false;
    }
    placed.push({
      level,
      state: 'pending_buy',
      buyTxid: txid,
      openedAt: Date.now(),
    });
  }

  for (const level of plan.staleLevels) {
    const stale = state.slots.find(
      (slot) => slot.state === 'pending_buy' && slot.level === level
    );
    if (stale) {
      await cancelSafely(stale.buyTxid, `stale pending @ ${stale.level.toFixed(2)}`);
      state.slots = state.slots.filter((slot) => slot !== stale);
    }
  }
  state.slots.push(...placed);
  state.gridAnchor = plan.newTop;
  log.info(`Grid shifted up: anchor ${plan.newTop.toFixed(2)} (price ${price.toFixed(2)})`);
  return true;
}

/**
 * Fresh-start anchor: no slots at all → drop pendingBuys limit buys at
 * floor, floor − step, floor − 2·step, … until we've placed the requested
 * number. Each one is independent; a rejection just leaves a gap that the
 * next tick will try to fill in.
 */
async function initialiseGrid(state: BotState, config: BotConfig, price: number): Promise<void> {
  const plan = planInitialGrid(price, config);
  state.gridAnchor = plan.gridAnchor;
  for (const level of plan.buyLevels) {
    const txid = await placeBuyOrder(level, config.amountPerLevel, config.pair);
    if (!txid) {
      continue;
    }
    state.slots.push({
      level,
      state: 'pending_buy',
      buyTxid: txid,
      openedAt: Date.now(),
    });
  }
  log.info(`Grid initialised at ${plan.gridAnchor.toFixed(2)} (price ${price.toFixed(2)})`);
}

function buildSummary(state: BotState, price: number): string {
  const parts = state.slots
    .slice()
    .sort((first, second) => second.level - first.level)
    .map((slot) => `${slot.state === 'owned' ? 'O' : 'p'}${slot.level.toFixed(0)}`);
  return `price ${price.toFixed(2)} | anchor ${state.gridAnchor?.toFixed(2) ?? '-'} | slots [${parts.join(' ') || 'none'}] | realized $${state.totalRealized.toFixed(4)} | fees $${state.totalFees.toFixed(4)} | cycles ${state.cycles}`;
}

function buildDedupKey(state: BotState): string {
  const slots = state.slots
    .slice()
    .sort((first, second) => first.level - second.level)
    .map((slot) => `${slot.state}:${slot.level.toFixed(2)}`)
    .join(',');
  return `${slots}|${state.totalRealized.toFixed(4)}|${state.cycles}`;
}

interface TickContext {
  lastDedupKey: string;
}

async function tick(state: BotState, context: TickContext): Promise<void> {
  const config = loadConfig();
  validateConfig(config);

  const events = await reconcileSlots(state, config);

  // Fills extend the grid one step lower each. TPs trigger a single
  // aggressive re-anchor to the current floor — no matter how many TPs
  // fired this tick, we jump straight to `floor(price/step)*step`.
  for (let index = 0; index < events.fills; index++) {
    await extendDown(state, config);
  }

  const price = await getTicker(config.pair);

  // Re-anchor every tick whenever price has moved beyond the highest
  // pending buy. Gating this on `events.tps > 0` left the grid stuck
  // behind on fast uptrends where price never returned to the existing
  // pending-buy levels and no TPs fired. planShiftUp is a no-op when
  // no shift is needed, so calling it unconditionally is safe.
  await shiftUp(state, config, price);

  if (state.slots.length === 0) {
    await initialiseGrid(state, config, price);
  }

  saveState(state);

  const dedupKey = buildDedupKey(state);
  if (dedupKey !== context.lastDedupKey) {
    log.info(buildSummary(state, price));
    context.lastDedupKey = dedupKey;
  }
}

async function main(): Promise<void> {
  if (!apiKey || !apiSecret) {
    log.error('Missing KRAKEN_API_KEY or KRAKEN_API_SECRET in bot/.env');
    process.exit(1);
  }

  const config = loadConfig();
  validateConfig(config);

  log.info('='.repeat(60));
  log.info('Grid bot -- spot longs, resting post-only limit orders');
  log.info(
    `pair ${config.pair} | step $${config.stepPrice} | $${config.amountPerLevel}/level | pending ${config.pendingBuys} | max slots ${config.maxTotalSlots} | grid depth ${config.maxGridDepth} | poll ${config.pollIntervalMs / 1000}s`
  );
  log.info('='.repeat(60));

  const state = loadState();
  if (state.slots.length > 0) {
    log.info(
      `Resumed -- ${state.slots.length} slot(s), realized $${state.totalRealized.toFixed(4)} across ${state.cycles} cycle(s)`
    );
  }

  const context: TickContext = { lastDedupKey: '' };
  let running = true;
  let stopping = false;
  process.on('SIGINT', () => {
    if (stopping) {
      return;
    }
    stopping = true;
    log.warn('SIGINT -- cancelling pending buys and exiting (TP sells left in place)...');
    running = false;
    void (async () => {
      for (const slot of state.slots) {
        if (slot.state === 'pending_buy') {
          await cancelSafely(slot.buyTxid, `pending buy @ ${slot.level.toFixed(2)}`);
        }
      }
      state.slots = state.slots.filter((slot) => slot.state === 'owned');
      saveState(state);
      log.info('Bot stopped cleanly.');
      process.exit(0);
    })();
  });

  while (running) {
    try {
      await tick(state, context);
    } catch (error) {
      log.error(`Tick failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!running) {
      break;
    }
    await sleep(config.pollIntervalMs);
  }
}

main().catch((error) => {
  log.error(`Fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
