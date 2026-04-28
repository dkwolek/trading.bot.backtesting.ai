import { LineData, UTCTimestamp } from 'lightweight-charts';
import { Trade } from '../../types/algo.types';
import { Candle } from '../../types/global.types';
import { toUTCTimestamp } from '../Chart/chart.utils';

/**
 * Builds chart data by sampling candle timestamps at regular intervals.
 * Uses the same approach as PriceChart — simple, ~200 evenly spaced points.
 * Balance at each point reflects all trades completed before that time.
 */
export function buildStrategyLineData(
  candles: Candle[],
  trades: Trade[],
  initialAmount: number,
  totalSlots: number
): LineData<UTCTimestamp>[] {
  if (candles.length === 0) {
    return [];
  }

  // Pre-compute balance after each trade, sorted by exit time. Additive
  // (not multiplicative) to match the Realized metric — every trade
  // deploys a fixed `capitalPerSlot`, profits are not re-invested into
  // bigger trades. Compounding `balance * deployedFraction * pnlPercent`
  // produced absurd 5-figure totals once cycle counts hit 4-5 digits.
  const capitalPerSlot = totalSlots > 0 ? initialAmount / totalSlots : initialAmount;
  const sortedTrades = [...trades].sort((tradeA, tradeB) => tradeA.exitTime - tradeB.exitTime);
  const exitBalances: { time: number; balance: number }[] = [];
  let balance = initialAmount;
  for (const trade of sortedTrades) {
    const dollarPnl = capitalPerSlot * trade.quantity * (trade.pnlPercent / 100);
    balance += dollarPnl;
    exitBalances.push({ time: trade.exitTime, balance });
  }

  // For a given time, find the balance (binary-search style but simple linear)
  function getBalance(time: number): number {
    let result = initialAmount;
    for (const entry of exitBalances) {
      if (entry.time <= time) {
        result = entry.balance;
      } else {
        break;
      }
    }
    return result;
  }

  // Sample ~200 points, same as PriceChart
  const maxPoints = 200;
  const step = Math.max(1, Math.floor(candles.length / maxPoints));
  const points: LineData<UTCTimestamp>[] = [];

  for (let index = 0; index < candles.length; index += step) {
    points.push({
      time: toUTCTimestamp(candles[index].time),
      value: getBalance(candles[index].time),
    });
  }

  // Always include last candle
  const lastCandle = candles[candles.length - 1];
  const lastPoint = points[points.length - 1];
  if (lastPoint && lastPoint.time !== toUTCTimestamp(lastCandle.time)) {
    points.push({
      time: toUTCTimestamp(lastCandle.time),
      value: getBalance(lastCandle.time),
    });
  }

  return points;
}
