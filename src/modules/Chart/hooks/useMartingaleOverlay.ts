import { IChartApi, IPriceLine, ISeriesApi, LineStyle, UTCTimestamp } from 'lightweight-charts';
import { useEffect } from 'react';
import { Candle } from '../../../types/global.types';
import { Trade } from '../../../types/algo.types';
import { toUTCTimestamp } from '../chart.utils';

// Right-axis label colors for grid steps and locked levels — kept as
// the user's "scanable" signal that capital is still parked there at
// the dataset's last candle.
const LOCKED_AXIS_BG = '#facc15';
const LOCKED_AXIS_TEXT = '#1f1f24';
const GRID_LINE_COLOR = '#3a3a4a';
const GRID_AXIS_BG = '#3a3a4a';
const GRID_AXIS_TEXT = '#9ca3af';
// Translucent amber for the time-bounded segment that visualises how
// long each open position has been holding — full-opacity reads as a
// hard band, this lets the price line through.
const LOCKED_LINE_COLOR = 'rgba(250, 204, 21, 0.18)';

// Draws the Auto Grid: dotted price lines at every `stepPrice` interval
// over the candle range. Levels that still hold an open position at
// the end of the backtest get an amber right-axis label plus a
// time-bounded translucent line that runs from the level's open time
// to the dataset's last candle, so the user can see for how long
// capital has been parked there.
export function useMartingaleOverlay(
  chartRef: React.MutableRefObject<IChartApi | null>,
  seriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>,
  candles: Candle[],
  stepPrice: number | null,
  trades?: Trade[]
) {
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) {
      return;
    }
    if (stepPrice === null || stepPrice <= 0 || candles.length === 0) {
      return;
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
    if (!Number.isFinite(minLow) || !Number.isFinite(maxHigh)) {
      return;
    }

    const startLevel = Math.floor(minLow / stepPrice) * stepPrice;
    const endLevel = Math.ceil(maxHigh / stepPrice) * stepPrice;
    const levelCount = Math.round((endLevel - startLevel) / stepPrice) + 1;

    const decimals = Math.max(0, -Math.floor(Math.log10(stepPrice)));
    const epsilon = stepPrice * 1e-6;
    chart.applyOptions({
      localization: {
        priceFormatter: (price: number) => {
          const remainder = Math.abs(price - Math.round(price / stepPrice) * stepPrice);
          if (remainder > epsilon) {
            return '';
          }
          return price.toFixed(decimals);
        },
      },
    });

    // Map level-index → earliest entry time across all OPEN trades for
    // that level. We use the earliest so the amber band reflects the
    // full duration the position has been parked, even if the level
    // cycled and reopened.
    const lockedOpenedAt = new Map<number, number>();
    if (trades) {
      for (const trade of trades) {
        if (trade.exitLabel !== 'OPEN') {
          continue;
        }
        const levelIndex = Math.round(trade.entryPrice / stepPrice);
        const existing = lockedOpenedAt.get(levelIndex);
        if (existing === undefined || trade.entryTime < existing) {
          lockedOpenedAt.set(levelIndex, trade.entryTime);
        }
      }
    }

    const finalCandle = candles[candles.length - 1];

    // Cap at 400 lines — denser grids tank render perf and become visual noise.
    const lines: IPriceLine[] = [];
    if (levelCount > 0 && levelCount <= 400) {
      for (let index = 0; index < levelCount; index++) {
        const price = startLevel + index * stepPrice;
        const levelIndex = Math.round(price / stepPrice);
        const isLocked = lockedOpenedAt.has(levelIndex);
        lines.push(
          series.createPriceLine({
            price,
            color: GRID_LINE_COLOR,
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            axisLabelColor: isLocked ? LOCKED_AXIS_BG : GRID_AXIS_BG,
            axisLabelTextColor: isLocked ? LOCKED_AXIS_TEXT : GRID_AXIS_TEXT,
          })
        );
      }
    }

    // Time-bounded amber segments for each locked level — start at the
    // earliest entry, end at the dataset's last candle. Drawn as a
    // separate line series per level so each one gets its own start
    // time without mixing into the main close-line series.
    const lockedSeries: ISeriesApi<'Line'>[] = [];
    for (const [levelIndex, openedAt] of lockedOpenedAt) {
      const linePrice = levelIndex * stepPrice;
      const lockSeries = chart.addLineSeries({
        color: LOCKED_LINE_COLOR,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      lockSeries.setData([
        { time: toUTCTimestamp(openedAt), value: linePrice },
        { time: toUTCTimestamp(finalCandle.time), value: linePrice },
      ]);
      lockedSeries.push(lockSeries);
    }

    return () => {
      for (const line of lines) {
        try {
          series.removePriceLine(line);
        } catch {
          // already disposed
        }
      }
      for (const lockSeries of lockedSeries) {
        try {
          chart.removeSeries(lockSeries);
        } catch {
          // already disposed
        }
      }
    };
  }, [chartRef, seriesRef, candles, stepPrice, trades]);
}
