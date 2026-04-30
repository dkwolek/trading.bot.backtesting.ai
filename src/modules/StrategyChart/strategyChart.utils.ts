import { LineData, UTCTimestamp } from 'lightweight-charts';
import { RealizedSnapshot } from '../../algos/auto-grid.algo';
import { Candle } from '../../types/global.types';
import { toUTCTimestamp } from '../Chart/chart.utils';

const MAX_POINTS = 200;

/**
 * Builds a balance line by sampling candle timestamps at regular
 * intervals. Each point's value = `initialAmount + cumulative realised
 * PnL up to that candle`, taken straight from the simulation's
 * realizedHistory so it matches the Realized metric exactly (including
 * compounded amountPerLevel bumps).
 */
export function buildStrategyLineData(
  candles: Candle[],
  realizedHistory: RealizedSnapshot[],
  initialAmount: number
): LineData<UTCTimestamp>[] {
  if (candles.length === 0) {
    return [];
  }

  const sortedHistory = [...realizedHistory].sort((first, second) => first.time - second.time);

  // Walk candles in time order, advancing a pointer through the history
  // so each candle gets the latest cumulative realised PnL ≤ its time.
  const step = Math.max(1, Math.floor(candles.length / MAX_POINTS));
  const points: LineData<UTCTimestamp>[] = [];
  let historyIndex = 0;
  let currentRealized = 0;

  function advanceTo(time: number) {
    while (historyIndex < sortedHistory.length && sortedHistory[historyIndex].time <= time) {
      currentRealized = sortedHistory[historyIndex].cumulative;
      historyIndex += 1;
    }
  }

  for (let index = 0; index < candles.length; index += step) {
    advanceTo(candles[index].time);
    points.push({
      time: toUTCTimestamp(candles[index].time),
      value: initialAmount + currentRealized,
    });
  }

  const lastCandle = candles[candles.length - 1];
  const lastPoint = points[points.length - 1];
  if (lastPoint && lastPoint.time !== toUTCTimestamp(lastCandle.time)) {
    advanceTo(lastCandle.time);
    points.push({
      time: toUTCTimestamp(lastCandle.time),
      value: initialAmount + currentRealized,
    });
  }

  return points;
}
