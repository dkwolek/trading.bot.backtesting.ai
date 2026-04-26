import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useState } from 'react';
import { LevelStat } from '../../../algos/auto-grid.algo';

interface Props {
  chartRef: React.MutableRefObject<IChartApi | null>;
  seriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>;
  stats: LevelStat[];
  height: number;
}

interface BarPosition {
  levelIndex: number;
  y: number;
  percentage: number;
  price: number;
}

const MAX_BAR_WIDTH_PX = 80;

/**
 * Anchored to the chart's right edge: each level the asset spent time at
 * gets a horizontal bar whose width tracks `% time on level`. Y position
 * is computed via the candle series' priceToCoordinate so the bars stay
 * lined up with their grid level on every zoom / pan / resize.
 */
export default function LevelOccupancyOverlay({ chartRef, seriesRef, stats, height }: Props) {
  const [positions, setPositions] = useState<BarPosition[]>([]);

  useEffect(() => {
    if (stats.length === 0) {
      setPositions([]);
      return;
    }

    function recompute() {
      const series = seriesRef.current;
      if (!series) {
        return;
      }
      const next: BarPosition[] = [];
      for (const stat of stats) {
        const y = series.priceToCoordinate(stat.price);
        if (y === null || y < 0 || y > height) {
          continue;
        }
        next.push({
          levelIndex: stat.levelIndex,
          y,
          percentage: stat.percentage,
          price: stat.price,
        });
      }
      setPositions(next);
    }

    recompute();
    // priceToCoordinate is only meaningful once the price scale has
    // settled, which happens asynchronously after data loads / zooms.
    // A cheap interval keeps the bars stuck to their levels through
    // pan / zoom / resize without diving into chart-internal events.
    const interval = setInterval(recompute, 500);
    return () => {
      clearInterval(interval);
    };
  }, [seriesRef, stats, height]);

  if (positions.length === 0) {
    return null;
  }
  const maxPct = stats.reduce((max, stat) => (stat.percentage > max ? stat.percentage : max), 0);
  if (maxPct <= 0) {
    return null;
  }

  return (
    <div
      className="absolute left-0 top-0 bottom-0 pointer-events-none"
      style={{ width: MAX_BAR_WIDTH_PX }}
    >
      {positions.map((position) => {
        const width = Math.max(2, (position.percentage / maxPct) * MAX_BAR_WIDTH_PX);
        return (
          <div
            key={position.levelIndex}
            className="absolute left-0 h-[2px] bg-[#f59e0b]/40"
            style={{ top: position.y - 1, width }}
            title={`$${position.price.toFixed(0)} — ${position.percentage.toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
}
