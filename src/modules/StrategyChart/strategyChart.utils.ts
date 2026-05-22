import { LineData, UTCTimestamp } from 'lightweight-charts';
import { RealizedSnapshot } from '../../algos/auto-grid.algo';
import { Candle } from '../../types/global.types';
import { toUTCTimestamp } from '../Chart/chart.utils';

const MAX_POINTS = 200;

export function buildStrategyLineData(
  candles: Candle[],
  realizedHistory: RealizedSnapshot[],
  unrealizedHistory: RealizedSnapshot[],
  initialAmount: number
): LineData<UTCTimestamp>[] {
  if (candles.length === 0) {
    return [];
  }

  const sortedRealized = [...realizedHistory].sort((first, second) => first.time - second.time);
  const sortedUnrealized = [...unrealizedHistory].sort((first, second) => first.time - second.time);

  const step = Math.max(1, Math.floor(candles.length / MAX_POINTS));
  const points: LineData<UTCTimestamp>[] = [];
  let realizedIndex = 0;
  let unrealizedIndex = 0;
  let currentRealized = 0;
  let currentUnrealized = 0;

  function advanceTo(time: number) {
    while (realizedIndex < sortedRealized.length && sortedRealized[realizedIndex].time <= time) {
      currentRealized = sortedRealized[realizedIndex].cumulative;
      realizedIndex += 1;
    }
    while (
      unrealizedIndex < sortedUnrealized.length &&
      sortedUnrealized[unrealizedIndex].time <= time
    ) {
      currentUnrealized = sortedUnrealized[unrealizedIndex].cumulative;
      unrealizedIndex += 1;
    }
  }

  for (let index = 0; index < candles.length; index += step) {
    advanceTo(candles[index].time);
    points.push({
      time: toUTCTimestamp(candles[index].time),
      value: initialAmount + currentRealized + currentUnrealized,
    });
  }

  const lastCandle = candles[candles.length - 1];
  const lastPoint = points[points.length - 1];
  if (lastPoint && lastPoint.time !== toUTCTimestamp(lastCandle.time)) {
    advanceTo(lastCandle.time);
    points.push({
      time: toUTCTimestamp(lastCandle.time),
      value: initialAmount + currentRealized + currentUnrealized,
    });
  }

  return points;
}
