import { SignalType } from '../constants/algo.constants';
import { TRADE_FEE } from '../constants/fees.constants';
import t from '../locales';
import { AlgoOptions, ControlDef, Signal } from '../types/algo.types';
import { Candle } from '../types/global.types';

const DEFAULT_STEP_PRICE = 25;
const DEFAULT_AMOUNT_PER_LEVEL = 10;
const DEFAULT_MONTHLY_MODE = false;
const DEFAULT_MONTHLY_AMOUNT = 1000;
const DEFAULT_MONTHLY_RANGE_PCT = 50;
const DEFAULT_DCA_ALLOCATION_PCT = 0;

export const AUTO_GRID_STEP_PRICE_KEY = 'autoGridStepPrice';
export const AUTO_GRID_AMOUNT_PER_LEVEL_KEY = 'autoGridAmountPerLevel';
export const AUTO_GRID_MONTHLY_MODE_KEY = 'autoGridMonthlyMode';
export const AUTO_GRID_MONTHLY_AMOUNT_KEY = 'autoGridMonthlyAmount';
export const AUTO_GRID_MONTHLY_RANGE_KEY = 'autoGridMonthlyRange';
export const AUTO_GRID_DCA_ALLOCATION_KEY = 'autoGridDcaAllocation';

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
    // monthlyMode overrides amountPerLevel dynamically
    // (freeCapital / numLevelsAtMonthBoundary) — leaving the slider
    // live in monthly mode would mislead about what's actually spent.
    disabledWhen: { key: AUTO_GRID_MONTHLY_MODE_KEY, value: true },
  },
  {
    key: AUTO_GRID_MONTHLY_MODE_KEY,
    title: t.autoGridControls.monthlyMode,
    type: 'checkbox',
    defaultValue: DEFAULT_MONTHLY_MODE,
    group: 'Monthly',
  },
  {
    key: AUTO_GRID_MONTHLY_AMOUNT_KEY,
    title: t.autoGridControls.monthlyAmount,
    type: 'slider',
    defaultValue: DEFAULT_MONTHLY_AMOUNT,
    min: 100,
    max: 10000,
    step: 100,
    group: 'Monthly',
  },
  {
    key: AUTO_GRID_MONTHLY_RANGE_KEY,
    title: t.autoGridControls.monthlyRange,
    type: 'slider',
    defaultValue: DEFAULT_MONTHLY_RANGE_PCT,
    min: 5,
    max: 95,
    step: 5,
    group: 'Monthly',
  },
  {
    key: AUTO_GRID_DCA_ALLOCATION_KEY,
    title: t.autoGridControls.dcaAllocation,
    type: 'slider',
    defaultValue: DEFAULT_DCA_ALLOCATION_PCT,
    min: 0,
    max: 100,
    step: 5,
    group: 'Monthly',
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

export function resolveMonthlyMode(options: AlgoOptions): boolean {
  const value = options[AUTO_GRID_MONTHLY_MODE_KEY];
  return typeof value === 'boolean' ? value : DEFAULT_MONTHLY_MODE;
}

export function resolveMonthlyAmount(options: AlgoOptions): number {
  const value = options[AUTO_GRID_MONTHLY_AMOUNT_KEY];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_MONTHLY_AMOUNT;
  }
  return value;
}

export function resolveMonthlyRangePct(options: AlgoOptions): number {
  const value = options[AUTO_GRID_MONTHLY_RANGE_KEY];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value >= 100) {
    return DEFAULT_MONTHLY_RANGE_PCT;
  }
  return value;
}

export function resolveDcaAllocationPct(options: AlgoOptions): number {
  const value = options[AUTO_GRID_DCA_ALLOCATION_KEY];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    return DEFAULT_DCA_ALLOCATION_PCT;
  }
  return value;
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
  realizedHistory: RealizedSnapshot[];
  uniqueLevelsTraded: number; // distinct level indices that had ≥ 1 buy
  requiredCapitalActual: number;
  totalDeposited: number; // initialAmount + monthly contributions
  monthlyResets: number; // count of new-month grid resets
  // Hybrid DCA portion. dcaCost = total $ spent on the hodl bag
  // (initial + monthly slices). dcaValue = current mark-to-market
  // value at the dataset's last close. dcaPnl = value − cost.
  dcaCost: number;
  dcaValue: number;
  dcaPnl: number;
  // hybridNetPnl combines grid net PnL + DCA PnL — the actual money
  // the user makes when running the bot in mixed mode.
  hybridNetPnl: number;
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
  initialAmount?: number;
  // Monthly contribution mode: every calendar month the bot adds
  // `monthlyAmount` to free capital, cancels pending grid orders
  // (in sim that's a no-op), and rebuilds the grid covering
  // [currentPrice × (1 − monthlyRangePct/100), currentPrice].
  // amountPerLevel = freeCapital / numLevels at rebuild time.
  // Owned bag positions are preserved across resets and cleared
  // only by their own TP.
  monthlyMode?: boolean;
  monthlyAmount?: number;
  monthlyRangePct?: number;
  // Hybrid DCA + grid: at every monthly contribution (and the initial
  // deposit), this fraction of the cash is parked into a permanent
  // hodl bag bought at the current candle's close. The remainder funds
  // the grid as before. The hodl bag never sells — its current value
  // is added to the simulation's net PnL at the end. With dcaAllocation
  // = 0 the behaviour is unchanged; with 100 the bot is pure DCA.
  dcaAllocationPct?: number;
}

export function simulateAutoGrid(candles: Candle[], config: BotSimConfig): AutoGridSimulation {
  const initialAmount = config.initialAmount ?? 0;
  const monthlyMode = config.monthlyMode ?? false;
  const monthlyAmount = Math.max(0, config.monthlyAmount ?? DEFAULT_MONTHLY_AMOUNT);
  const monthlyRangePct = Math.max(
    1,
    Math.min(99, config.monthlyRangePct ?? DEFAULT_MONTHLY_RANGE_PCT)
  );
  const dcaAllocationFraction =
    Math.max(0, Math.min(100, config.dcaAllocationPct ?? DEFAULT_DCA_ALLOCATION_PCT)) / 100;
  const stepPrice = config.stepPrice;

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
      realizedHistory: [],
      uniqueLevelsTraded: 0,
      requiredCapitalActual: 0,
      totalDeposited: initialAmount,
      monthlyResets: 0,
      dcaCost: 0,
      dcaValue: 0,
      dcaPnl: 0,
      hybridNetPnl: 0,
    };
  }

  // Owned slots keyed by integer level index — guarantees uniqueness even
  // for non-round step sizes that would otherwise drift under repeated
  // float arithmetic.
  const owned = new Map<number, OwnedSlot>();
  let totalProfit = 0;
  let amountPerLevel = config.amountPerLevel;

  // Monthly mode bookkeeping.
  let freeCapital = initialAmount;
  let totalDeposited = initialAmount;
  let monthlyResets = 0;
  let lastMonthKey = -1;
  let monthlyFloorIndex = 0;
  let monthlyCeilingIndex = 0;
  if (monthlyMode) {
    monthlyCeilingIndex = Math.max(1, Math.floor(candles[0].close / stepPrice));
    monthlyFloorIndex = Math.max(
      0,
      Math.floor((candles[0].close * (1 - monthlyRangePct / 100)) / stepPrice)
    );
  }

  // Hybrid DCA bag — accumulated base from periodic permanent buys.
  // Active only when monthly mode is on AND dcaAllocationFraction > 0.
  let dcaBase = 0;
  let dcaCost = 0;
  function dcaBuy(amount: number, price: number) {
    if (amount <= 0 || price <= 0) {
      return;
    }
    dcaBase += (amount * (1 - TRADE_FEE)) / price;
    dcaCost += amount;
    freeCapital -= amount;
  }

  let cycles = 0;
  let maxCapital = 0;
  const signals: Signal[] = [];
  const realizedHistory: RealizedSnapshot[] = [];
  const tradedLevels = new Set<number>();

  // TP scan + chase cascading. Called twice per candle (before fills
  // and after fills) so same-bar buy-then-TP cycles get caught — that's
  // what closes the gap between low-resolution backtest and live bot
  // behaviour, where limit orders fire on every tick crossing.
  function runTpScan(candle: Candle, highIndex: number) {
    let tpProgress = true;
    while (tpProgress) {
      tpProgress = false;
      for (const [levelIndex, slot] of Array.from(owned.entries())) {
        const tpIndex = levelIndex + 1;
        if (highIndex >= tpIndex) {
          const tpPrice = tpIndex * stepPrice;
          totalProfit += slot.volume * tpPrice - slot.cost;
          if (monthlyMode) {
            freeCapital += slot.volume * tpPrice;
          }
          cycles += 1;
          realizedHistory.push({ time: candle.time, cumulative: totalProfit });
          signals.push({
            time: slot.ownedAt,
            type: SignalType.Buy,
            price: slot.level,
            label: 'L1',
            cost: slot.cost,
          });
          signals.push({
            time: candle.time,
            type: SignalType.Sell,
            price: tpPrice,
            label: 'TP',
            referencePrice: slot.level,
          });
          owned.delete(levelIndex);
          tpProgress = true;
          if (!owned.has(tpIndex)) {
            const enoughCapital = !monthlyMode || freeCapital >= amountPerLevel;
            if (enoughCapital) {
              const chaseLevelPrice = tpIndex * stepPrice;
              const volume = (amountPerLevel * (1 - TRADE_FEE)) / chaseLevelPrice;
              owned.set(tpIndex, {
                level: chaseLevelPrice,
                buyPrice: chaseLevelPrice,
                volume,
                cost: amountPerLevel,
                ownedAt: candle.time,
              });
              tradedLevels.add(tpIndex);
              if (monthlyMode) {
                freeCapital -= amountPerLevel;
              }
            }
          }
        }
      }
    }
  }

  let prevCloseIndex = Math.floor(candles[0].open / stepPrice);

  for (let candleIdx = 0; candleIdx < candles.length; candleIdx++) {
    const candle = candles[candleIdx];
    // 0. Monthly contribution + grid rebuild on the first candle of a
    //    new calendar month. Bag (owned slots) is preserved — only the
    //    grid bounds + amountPerLevel reset. freeCapital absorbs the
    //    new monthlyAmount.
    if (monthlyMode) {
      const candleDate = new Date(candle.time * 1000);
      const monthKey = candleDate.getUTCFullYear() * 12 + candleDate.getUTCMonth();
      if (monthKey !== lastMonthKey) {
        const monthDcaFraction = dcaAllocationFraction;
        if (lastMonthKey === -1) {
          // First candle: split the initial deposit into DCA bag +
          // grid free pool. Initial freeCapital was seeded with
          // initialAmount; we just siphon the DCA share off.
          if (monthDcaFraction > 0 && initialAmount > 0) {
            dcaBuy(initialAmount * monthDcaFraction, candle.close);
          }
        } else {
          // Subsequent month — top up wallet, then siphon DCA share
          // before rebuilding the grid.
          freeCapital += monthlyAmount;
          totalDeposited += monthlyAmount;
          monthlyResets += 1;
          if (monthDcaFraction > 0 && monthlyAmount > 0) {
            dcaBuy(monthlyAmount * monthDcaFraction, candle.close);
          }
        }
        monthlyCeilingIndex = Math.max(1, Math.floor(candle.close / stepPrice));
        monthlyFloorIndex = Math.max(
          0,
          Math.floor((candle.close * (1 - monthlyRangePct / 100)) / stepPrice)
        );
        const numLevels = Math.max(1, monthlyCeilingIndex - monthlyFloorIndex);
        amountPerLevel = freeCapital / numLevels;
        lastMonthKey = monthKey;
      }
    }

    const lowIndex = Math.ceil(candle.low / stepPrice);
    const highIndex = Math.floor(candle.high / stepPrice);

    // 1a. TPs against candle.high — close any owned position whose TP
    //     price already sits at/below the high. Cascading chase rebuys
    //     captured via while-progress loop in `runTpScan`.
    runTpScan(candle, highIndex);

    // 2. Fills against candle.low — every level the price crossed going
    //    DOWN from the prior candle's close (between prevCloseIndex and
    //    lowIndex, inclusive) gets bought if no slot is currently owned.
    //    Monthly mode reserves capital for levels above `priceFloor`
    //    by skipping anything ≤ monthlyFloorIndex and gating each buy
    //    on freeCapital. The upper bound is intentionally NOT capped
    //    at monthlyCeiling — once chase pushed positions above it,
    //    a subsequent price drop should refill those levels instead
    //    of leaving the grid dormant until the next monthly reset.
    const fillCeiling = prevCloseIndex;
    for (let levelIndex = fillCeiling; levelIndex >= lowIndex; levelIndex--) {
      if (levelIndex <= 0) {
        break;
      }
      if (monthlyMode && levelIndex <= monthlyFloorIndex) {
        break;
      }
      if (owned.has(levelIndex)) {
        continue;
      }
      if (monthlyMode && freeCapital < amountPerLevel) {
        break;
      }
      const levelPrice = levelIndex * stepPrice;
      const volume = (amountPerLevel * (1 - TRADE_FEE)) / levelPrice;
      owned.set(levelIndex, {
        level: levelPrice,
        buyPrice: levelPrice,
        volume,
        cost: amountPerLevel,
        ownedAt: candle.time,
      });
      tradedLevels.add(levelIndex);
      if (monthlyMode) {
        freeCapital -= amountPerLevel;
      }
    }

    let capitalDeployed = 0;
    for (const slot of owned.values()) {
      capitalDeployed += slot.cost;
    }
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
    signals.push({
      time: slot.ownedAt,
      type: SignalType.Buy,
      price: slot.level,
      label: 'L1',
      cost: slot.cost,
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
  const dcaValue = dcaBase * finalPrice;
  const dcaPnl = dcaValue - dcaCost;

  // Required capital denominator:
  // - monthly mode: total cumulative deposits (the only meaningful
  //   denominator since capital arrives over time)
  // - default: peak concurrent owned (matches user expectation that
  //   "required capital = worst-moment locked")
  const requiredCapitalActual = monthlyMode ? totalDeposited : maxCapital;

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
    realizedHistory,
    uniqueLevelsTraded: tradedLevels.size,
    requiredCapitalActual,
    totalDeposited,
    monthlyResets,
    dcaCost,
    dcaValue,
    dcaPnl,
    hybridNetPnl: totalProfit + unrealizedPnl + dcaPnl,
  };
}

// Special options key used by `runBacktest` to pass initialAmount into
// the algo without changing the Algorithm signature.
export const AUTO_GRID_INITIAL_AMOUNT_KEY = '__autoGridInitialAmount';

function resolveInjectedInitialAmount(options: AlgoOptions): number {
  const value = options[AUTO_GRID_INITIAL_AMOUNT_KEY];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function run(candles: Candle[], options: AlgoOptions): Signal[] {
  const result = simulateAutoGrid(candles, {
    stepPrice: resolveStepPrice(options),
    amountPerLevel: resolveAmountPerLevel(options),
    initialAmount: resolveInjectedInitialAmount(options),
    monthlyMode: resolveMonthlyMode(options),
    monthlyAmount: resolveMonthlyAmount(options),
    monthlyRangePct: resolveMonthlyRangePct(options),
    dcaAllocationPct: resolveDcaAllocationPct(options),
  });
  return result.signals;
}
