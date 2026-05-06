import { TRADE_FEE } from '../constants/fees.constants';
import { Candle } from '../types/global.types';

export interface DcaBuyEvent {
  time: number;
  price: number;
  amount: number;
}

export interface DcaResult {
  totalSpent: number;
  totalBase: number;
  finalValue: number;
  netPnl: number;
  netPct: number;
  events: DcaBuyEvent[];
}

/**
 * DCA baseline. Two modes:
 *
 * - Monthly (`monthlyAmount > 0`): on the first candle of each calendar
 *   month spend `monthlyAmount` at that candle's close. Initial wallet
 *   `initialAmount` is also spent at the very first candle. Mirrors a
 *   real "set up auto-buy on payday" workflow and lines up directly
 *   with the auto-grid's monthly mode for an apples-to-apples compare.
 *
 * - Per-candle (default): spread `initialAmount` evenly across every
 *   candle, buying at each close. The legacy lump-sum baseline.
 */
export function simulateDCA(
  candles: Candle[],
  initialAmount: number,
  monthlyAmount = 0
): DcaResult {
  if (candles.length === 0 || initialAmount < 0) {
    return { totalSpent: 0, totalBase: 0, finalValue: 0, netPnl: 0, netPct: 0, events: [] };
  }

  let totalSpent = 0;
  let totalBase = 0;
  const events: DcaBuyEvent[] = [];

  function buy(amount: number, price: number, time: number) {
    if (amount <= 0 || price <= 0) {
      return;
    }
    totalSpent += amount;
    totalBase += (amount * (1 - TRADE_FEE)) / price;
    events.push({ time, price, amount });
  }

  if (monthlyAmount > 0) {
    if (initialAmount > 0) {
      buy(initialAmount, candles[0].close, candles[0].time);
    }
    let lastMonthKey = -1;
    for (const candle of candles) {
      const date = new Date(candle.time * 1000);
      const monthKey = date.getUTCFullYear() * 12 + date.getUTCMonth();
      if (monthKey !== lastMonthKey) {
        if (lastMonthKey !== -1) {
          buy(monthlyAmount, candle.close, candle.time);
        }
        lastMonthKey = monthKey;
      }
    }
  } else if (initialAmount > 0) {
    const allocation = initialAmount / candles.length;
    for (const candle of candles) {
      buy(allocation, candle.close, candle.time);
    }
  }

  const finalPrice = candles[candles.length - 1].close;
  const finalValue = totalBase * finalPrice;
  const netPnl = finalValue - totalSpent;
  const netPct = totalSpent > 0 ? (netPnl / totalSpent) * 100 : 0;
  return { totalSpent, totalBase, finalValue, netPnl, netPct, events };
}
