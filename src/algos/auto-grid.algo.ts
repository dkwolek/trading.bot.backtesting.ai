import { SignalType } from '../constants/algo.constants';
import { TRADE_FEE } from '../constants/fees.constants';
import t from '../locales';
import { AlgoOptions, ControlDef, Signal } from '../types/algo.types';
import { Candle } from '../types/global.types';

const DEFAULT_STEP_PRICE = 25;
const DEFAULT_AMOUNT_PER_LEVEL = 10;
const DEFAULT_COMPOUNDING = false;

// Each compound bump scales `amountPerLevel` by this fraction (10%) and
// requires `levelCount * amountPerLevel * COMPOUND_RATIO` fresh realised
// profit. Threshold scales with current size so each bump costs more to
// earn — keeps the relative growth constant instead of fading out as
// the +$1/level rule did once amountPerLevel got large.
const COMPOUND_RATIO = 0.1;

export const AUTO_GRID_STEP_PRICE_KEY = 'autoGridStepPrice';
export const AUTO_GRID_AMOUNT_PER_LEVEL_KEY = 'autoGridAmountPerLevel';
export const AUTO_GRID_COMPOUNDING_KEY = 'autoGridCompounding';

export const controls: ControlDef[] = [
  {
    key: AUTO_GRID_STEP_PRICE_KEY,
    title: t.autoGridControls.stepPrice,
    type: 'slider',
    defaultValue: DEFAULT_STEP_PRICE,
    min: 5,
    max: 1000,
    step: 5,
    group: 'Levels',
  },
  {
    key: AUTO_GRID_AMOUNT_PER_LEVEL_KEY,
    title: t.autoGridControls.amountPerLevel,
    type: 'slider',
    defaultValue: DEFAULT_AMOUNT_PER_LEVEL,
    min: 5,
    max: 1000,
    step: 5,
    group: 'Levels',
  },
  {
    key: AUTO_GRID_COMPOUNDING_KEY,
    title: t.autoGridControls.compounding,
    type: 'checkbox',
    defaultValue: DEFAULT_COMPOUNDING,
    group: 'Levels',
  },
];

export function resolveStepPrice(options: AlgoOptions): number {
  const value = options[AUTO_GRID_STEP_PRICE_KEY];
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_STEP_PRICE;
}

export function resolveAmountPerLevel(options: AlgoOptions): number {
  const value = options[AUTO_GRID_AMOUNT_PER_LEVEL_KEY];
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_AMOUNT_PER_LEVEL;
}

export function resolveCompounding(options: AlgoOptions): boolean {
  const value = options[AUTO_GRID_COMPOUNDING_KEY];
  return typeof value === 'boolean' ? value : DEFAULT_COMPOUNDING;
}

export interface MaxDropInfo {
  steps: number;
  startTime: number | null;
  endTime: number | null;
}

export interface LockedLevel {
  level: number;
  openedAt: number;
}

export interface LevelStat {
  levelIndex: number;
  price: number;
  count: number;
  percentage: number;
}

export interface AutoGridSimulation {
  totalProfit: number; // sum of realised PnL across every closed cycle
  maxCapitalDeployed: number; // peak quote currency tied up in owned positions
  completedCycles: number; // number of full buy → TP cycles
  openPositionsAtEnd: number; // bag-holders left open at the dataset's last candle
  openPositionsCost: number; // quote spent on those bag-holders
  openPositionsMarketValue: number; // current value at last close
  unrealizedPnl: number; // openPositionsMarketValue − openPositionsCost
  netPnl: number; // totalProfit + unrealizedPnl
  lockedLevels: LockedLevel[];
  endTime: number;
  signals: Signal[];
  compoundEvents: CompoundEvent[]; // when amountPerLevel was bumped
  // Per-cycle snapshot of cumulative realised PnL — drives the strategy
  // performance chart so it matches `totalProfit` exactly (including
  // compounded amountPerLevel bumps that buildTrades/computeMetrics
  // can't see, since they only carry pnlPercent).
  realizedHistory: RealizedSnapshot[];
}

export interface RealizedSnapshot {
  time: number;
  cumulative: number;
}

interface OwnedSlot {
  level: number;
  buyPrice: number;
  volume: number;
  cost: number;
  ownedAt: number;
}

export function computeLevelOccupancy(candles: Candle[], stepPrice: number): LevelStat[] {
  if (candles.length === 0 || stepPrice <= 0) {
    return [];
  }
  const counts = new Map<number, number>();
  for (const candle of candles) {
    const levelIndex = Math.floor(candle.close / stepPrice);
    counts.set(levelIndex, (counts.get(levelIndex) ?? 0) + 1);
  }
  const total = candles.length;
  const stats: LevelStat[] = [];
  for (const [levelIndex, count] of counts) {
    stats.push({
      levelIndex,
      price: levelIndex * stepPrice,
      count,
      percentage: (count / total) * 100,
    });
  }
  stats.sort((first, second) => second.count - first.count);
  return stats;
}

export interface RequiredCapital {
  levels: number;
  capital: number;
  minPrice: number;
  maxPrice: number;
}

// How much quote currency the bot would need to fully cover the period's
// price range — (maxHigh − minLow) / stepPrice levels, each costing
// `amountPerLevel`. Useful as a sanity check against the user's
// configured initialAmount.
export function computeRequiredCapital(
  candles: Candle[],
  stepPrice: number,
  amountPerLevel: number
): RequiredCapital {
  if (candles.length === 0 || stepPrice <= 0 || amountPerLevel <= 0) {
    return { levels: 0, capital: 0, minPrice: 0, maxPrice: 0 };
  }
  let minLow = Number.POSITIVE_INFINITY;
  let maxHigh = Number.NEGATIVE_INFINITY;
  for (const candle of candles) {
    if (candle.low < minLow) {
      minLow = candle.low;
    }
    if (candle.high > maxHigh) {
      maxHigh = candle.high;
    }
  }
  const levels = Math.max(0, Math.ceil((maxHigh - minLow) / stepPrice));
  return {
    levels,
    capital: levels * amountPerLevel,
    minPrice: minLow,
    maxPrice: maxHigh,
  };
}

export function computeMaxDropInfo(candles: Candle[], stepPrice: number): MaxDropInfo {
  if (candles.length === 0 || stepPrice <= 0) {
    return { steps: 0, startTime: null, endTime: null };
  }
  let prevLevel = Math.floor(candles[0].close / stepPrice) * stepPrice;
  let currentStreak = 0;
  let currentStart = candles[0].time;
  let maxStreak = 0;
  let maxStart: number | null = null;
  let maxEnd: number | null = null;
  for (let index = 1; index < candles.length; index++) {
    const candle = candles[index];
    const level = Math.floor(candle.close / stepPrice) * stepPrice;
    const deltaSteps = Math.round((level - prevLevel) / stepPrice);
    if (deltaSteps < 0) {
      if (currentStreak === 0) {
        currentStart = candles[index - 1].time;
      }
      currentStreak += -deltaSteps;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStart = currentStart;
        maxEnd = candle.time;
      }
    } else if (deltaSteps > 0) {
      currentStreak = 0;
    }
    prevLevel = level;
  }
  return { steps: maxStreak, startTime: maxStart, endTime: maxEnd };
}

export interface BotSimConfig {
  stepPrice: number;
  amountPerLevel: number;
  // When true, every dollar of realised PnL per grid level is folded
  // back into amountPerLevel (e.g. 20 levels and +$20 realised → +$1
  // each, levelSize bumps from $10 → $11). The bumps fire whenever
  // the threshold is crossed; emitted as a 'COMPOUND' marker so the
  // chart can show when each level-size jump happened.
  compounding?: boolean;
}

export interface CompoundEvent {
  time: number;
  amountPerLevel: number;
}

/**
 * Infinite-grid simulation: no slot cap, no anchor, no shift logic. Each
 * price level (integer multiple of `stepPrice`) cycles independently —
 * a buy fires the first time `low` reaches the level after price was
 * above it, a TP fires when `high` reaches `level + stepPrice` for an
 * owned slot, and the level becomes immediately re-fillable. Reflects
 * "what if I had unlimited capital and a buy + TP at every grid level".
 */
export function simulateAutoGrid(candles: Candle[], config: BotSimConfig): AutoGridSimulation {
  const { stepPrice } = config;
  const compounding = config.compounding ?? false;
  if (candles.length === 0 || stepPrice <= 0 || config.amountPerLevel <= 0) {
    return {
      totalProfit: 0,
      maxCapitalDeployed: 0,
      completedCycles: 0,
      openPositionsAtEnd: 0,
      openPositionsCost: 0,
      openPositionsMarketValue: 0,
      unrealizedPnl: 0,
      netPnl: 0,
      lockedLevels: [],
      endTime: 0,
      signals: [],
      compoundEvents: [],
      realizedHistory: [],
    };
  }

  // Number of grid levels covered by the period's price range — drives
  // the compounding threshold: each bump needs `levelCount × current
  // amountPerLevel × COMPOUND_RATIO` of fresh realised profit (i.e.
  // enough to grow every level by the ratio).
  let rangeMinLow = Number.POSITIVE_INFINITY;
  let rangeMaxHigh = Number.NEGATIVE_INFINITY;
  for (const candle of candles) {
    if (candle.low < rangeMinLow) {
      rangeMinLow = candle.low;
    }
    if (candle.high > rangeMaxHigh) {
      rangeMaxHigh = candle.high;
    }
  }
  const levelCount = Math.max(1, Math.ceil((rangeMaxHigh - rangeMinLow) / stepPrice));

  // Owned slots keyed by integer level index — guarantees uniqueness even
  // for non-round step sizes that would otherwise drift under repeated
  // float arithmetic.
  const owned = new Map<number, OwnedSlot>();
  let totalProfit = 0;
  let compoundedAmount = 0;
  let amountPerLevel = config.amountPerLevel;
  let cycles = 0;
  let maxCapital = 0;
  const signals: Signal[] = [];
  const compoundEvents: CompoundEvent[] = [];
  const realizedHistory: RealizedSnapshot[] = [];

  // We use the previous candle's close as the upper boundary for new
  // fills: a buy at level L fires only if price was above L at the end
  // of the prior candle and dropped to ≤ L during this one. Using high
  // instead would buy a level on the way UP (e.g. price rises through
  // $2320 to $2330, then drops to $2315 — that's not a "down cross" of
  // $2320, so the buy at $2320 should wait for a later candle that
  // actually crosses $2320 going down).
  let prevCloseIndex = Math.floor(candles[0].open / stepPrice);

  for (const candle of candles) {
    // ceil for the low so we only count grid levels at or above `low` —
    // floor would buy the level just below low (e.g. low=$2308, step=$10
    // → floor=230=$2300), firing a phantom cycle whose TP shows up on the
    // very next candle.
    const lowIndex = Math.ceil(candle.low / stepPrice);
    const highIndex = Math.floor(candle.high / stepPrice);

    // 1. TPs against candle.high — every owned whose TP price (level + step)
    //    fits below the high closes for profit. Sell side is fee-free;
    //    only the buy paid a maker fee, already baked into volume.
    for (const [levelIndex, slot] of Array.from(owned.entries())) {
      const tpIndex = levelIndex + 1;
      if (highIndex >= tpIndex) {
        const tpPrice = tpIndex * stepPrice;
        totalProfit += slot.volume * tpPrice - slot.cost;
        cycles += 1;
        realizedHistory.push({ time: candle.time, cumulative: totalProfit });
        signals.push({
          time: slot.ownedAt,
          type: SignalType.Buy,
          price: slot.level,
          label: 'L1',
        });
        signals.push({
          time: candle.time,
          type: SignalType.Sell,
          price: tpPrice,
          label: 'TP',
          referencePrice: slot.level,
        });
        owned.delete(levelIndex);

        // Compounding: scale `amountPerLevel` by COMPOUND_RATIO whenever
        // realised profit covers the same ratio worth of grid coverage.
        // Threshold uses the *current* amountPerLevel so each bump costs
        // more to earn than the previous — relative growth stays
        // constant instead of fading out at high amountPerLevel values.
        if (compounding) {
          while (true) {
            const threshold = levelCount * amountPerLevel * COMPOUND_RATIO;
            if (totalProfit - compoundedAmount < threshold) {
              break;
            }
            compoundedAmount += threshold;
            amountPerLevel = amountPerLevel * (1 + COMPOUND_RATIO);
            compoundEvents.push({ time: candle.time, amountPerLevel });
          }
        }
      }
    }

    // 2. Fills against candle.low — every level the price crossed going
    //    DOWN from the prior candle's close (between prevCloseIndex and
    //    lowIndex, inclusive) gets bought if no slot is currently owned.
    const fillCeiling = prevCloseIndex;
    for (let levelIndex = fillCeiling; levelIndex >= lowIndex; levelIndex--) {
      if (levelIndex <= 0) {
        break;
      }
      if (owned.has(levelIndex)) {
        continue;
      }
      const levelPrice = levelIndex * stepPrice;
      // Maker fee is taken from the quote, so the base volume we
      // actually receive is reduced proportionally.
      const volume = (amountPerLevel * (1 - TRADE_FEE)) / levelPrice;
      owned.set(levelIndex, {
        level: levelPrice,
        buyPrice: levelPrice,
        volume,
        cost: amountPerLevel,
        ownedAt: candle.time,
      });
    }

    const capitalDeployed = owned.size * amountPerLevel;
    if (capitalDeployed > maxCapital) {
      maxCapital = capitalDeployed;
    }

    prevCloseIndex = Math.floor(candle.close / stepPrice);
  }

  const finalCandle = candles[candles.length - 1];
  const finalPrice = finalCandle.close;
  let openCost = 0;
  let openValue = 0;
  const lockedLevels: LockedLevel[] = [];
  for (const slot of owned.values()) {
    openCost += slot.cost;
    openValue += slot.volume * finalPrice;
    lockedLevels.push({ level: slot.level, openedAt: slot.ownedAt });
    // Emit Buy + synthetic OPEN Sell so the framework's buildTrades pairs
    // them — that surfaces the unrealised PnL in the trades table without
    // polluting realised metrics (computeMetrics filters out exitLabel
    // === 'OPEN').
    signals.push({
      time: slot.ownedAt,
      type: SignalType.Buy,
      price: slot.level,
      label: 'L1',
    });
    signals.push({
      time: finalCandle.time,
      type: SignalType.Sell,
      price: finalPrice,
      label: 'OPEN',
      referencePrice: slot.level,
    });
  }
  const unrealizedPnl = openValue - openCost;

  return {
    totalProfit,
    maxCapitalDeployed: maxCapital,
    completedCycles: cycles,
    openPositionsAtEnd: owned.size,
    openPositionsCost: openCost,
    openPositionsMarketValue: openValue,
    unrealizedPnl,
    netPnl: totalProfit + unrealizedPnl,
    lockedLevels,
    endTime: finalCandle.time,
    signals,
    compoundEvents,
    realizedHistory,
  };
}

// Drives the backtest framework: emits one Buy/Sell pair per closed cycle,
// adjacent in the array so buildTrades pairs them 1:1.
export function run(candles: Candle[], options: AlgoOptions): Signal[] {
  const result = simulateAutoGrid(candles, {
    stepPrice: resolveStepPrice(options),
    amountPerLevel: resolveAmountPerLevel(options),
    compounding: resolveCompounding(options),
  });
  return result.signals;
}
