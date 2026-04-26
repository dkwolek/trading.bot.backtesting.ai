import { SignalType } from '../constants/algo.constants';
import { TRADE_FEE } from '../constants/fees.constants';
import {
  Algorithm,
  AlgoOptions,
  BacktestMetrics,
  BacktestResult,
  Signal,
  Trade,
} from '../types/algo.types';
import { Candle } from '../types/global.types';

function weightedAveragePrice(buys: Signal[]): number {
  const totalValue = buys.reduce((sum, buy) => sum + buy.price, 0);
  return totalValue / buys.length;
}

function buildTrades(signals: Signal[]): Trade[] {
  const trades: Trade[] = [];
  const buyQueue: Signal[] = [];
  const sellQueue: Signal[] = [];

  for (const signal of signals) {
    if (signal.type === SignalType.Buy) {
      // Close short if sellQueue has entries
      if (sellQueue.length > 0) {
        const entryPrice = weightedAveragePrice(sellQueue);
        const entryTime = sellQueue[0].time;
        // Short cycle: entry sell pays the maker fee, the closing buy
        // is treated as fee-free per Kraken-on-this-bot specifics.
        const grossPnl = entryPrice - signal.price;
        const pnl = grossPnl - entryPrice * TRADE_FEE;
        const pnlPercent = (pnl / entryPrice) * 100;
        const levels = sellQueue.map((sell) => ({
          label: sell.label ?? 'S',
          price: sell.price,
          time: sell.time,
        }));
        trades.push({
          entryTime,
          exitTime: signal.time,
          entryPrice,
          exitPrice: signal.price,
          exitLabel: signal.label ?? 'B',
          pnl,
          pnlPercent,
          quantity: sellQueue.length,
          levels,
        });
        sellQueue.length = 0;
      } else {
        buyQueue.push(signal);
      }
    } else if (signal.type === SignalType.Sell) {
      // Close long if buyQueue has entries
      if (buyQueue.length > 0) {
        const entryPrice = weightedAveragePrice(buyQueue);
        const entryTime = buyQueue[0].time;
        // Long cycle: only the entry buy pays the maker fee; TP exit
        // is fee-free.
        const grossPnl = signal.price - entryPrice;
        const pnl = grossPnl - entryPrice * TRADE_FEE;
        const pnlPercent = (pnl / entryPrice) * 100;
        const levels = buyQueue.map((buy) => ({
          label: buy.label ?? 'B',
          price: buy.price,
          time: buy.time,
        }));
        trades.push({
          entryTime,
          exitTime: signal.time,
          entryPrice,
          exitPrice: signal.price,
          exitLabel: signal.label ?? 'S',
          pnl,
          pnlPercent,
          quantity: buyQueue.length,
          levels,
        });
        buyQueue.length = 0;
      } else {
        sellQueue.push(signal);
      }
    }
  }

  return trades;
}

function computeMetrics(
  trades: Trade[],
  initialAmount: number,
  totalSlots: number
): BacktestMetrics {
  // Open positions (synthetic OPEN exits) carry unrealised PnL only —
  // they should not skew win-rate / total-return / drawdown which all
  // describe realised performance.
  const closedTrades = trades.filter((trade) => trade.exitLabel !== 'OPEN');
  if (closedTrades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalReturn: 0,
      avgTradeReturn: 0,
      maxDrawdown: 0,
      exitCounts: {},
    };
  }

  const winCount = closedTrades.filter((trade) => trade.pnl > 0).length;
  const exitCounts: Record<string, number> = {};
  for (const trade of closedTrades) {
    exitCounts[trade.exitLabel] = (exitCounts[trade.exitLabel] ?? 0) + 1;
  }

  // Each trade uses a fixed slot worth `initialAmount / totalSlots` of
  // capital — profits are not re-invested into bigger trades. Without
  // this, compounding inflates the total-return number well above what
  // the bot would actually realise (the in-grid Realised metric is the
  // true number to match).
  const capitalPerSlot = initialAmount / totalSlots;
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trade of trades) {
    const dollarPnl = capitalPerSlot * trade.quantity * (trade.pnlPercent / 100);
    cumulative += dollarPnl;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdownDollars = peak - cumulative;
    const drawdownPct = initialAmount > 0 ? (drawdownDollars / initialAmount) * 100 : 0;
    if (drawdownPct > maxDrawdown) {
      maxDrawdown = drawdownPct;
    }
  }

  const totalReturn = initialAmount > 0 ? (cumulative / initialAmount) * 100 : 0;

  return {
    totalTrades: trades.length,
    winRate: (winCount / trades.length) * 100,
    totalReturn,
    avgTradeReturn: totalReturn / trades.length,
    maxDrawdown,
    exitCounts,
  };
}

function resolveTotalSlots(options: AlgoOptions, initialAmount: number): number {
  // Auto Grid: each trade is one fixed-size buy worth
  // `autoGridAmountPerLevel`, so the effective slot count is how many
  // such buys the initial capital can fund. Otherwise the metrics
  // panel would compound trades against 1/3 of balance and report
  // wildly different totals from the in-grid Realised number.
  const amount = options.autoGridAmountPerLevel;
  if (typeof amount === 'number' && amount > 0 && initialAmount > 0) {
    return Math.max(1, initialAmount / amount);
  }
  return 3;
}

export function runBacktest(
  candles: Candle[],
  algorithm: Algorithm,
  initialAmount: number,
  options: AlgoOptions
): BacktestResult {
  const signals = algorithm.run(candles, options);
  const trades = buildTrades(signals);
  const totalSlots = resolveTotalSlots(options, initialAmount);
  const metrics = computeMetrics(trades, initialAmount, totalSlots);
  return { signals, trades, metrics };
}
