import { IChartApi, ISeriesApi, LineData, UTCTimestamp } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { Candle } from '../../../types/global.types';
import { toUTCTimestamp } from '../chart.utils';

const EMA_COLOR = '#fbbf24';
const BAND_COLOR = 'rgba(251, 191, 36, 0.35)';

// Renders the trend filter's EMA + lower-band cutoff as two thin
// yellow lines so it's visually obvious where buys are getting blocked.
// When sim returns empty arrays (filter off, no data) we tear them down.
//
// Defensive against chart recreation: pair/mode switches dispose the
// underlying IChartApi but our refs still point at series that belonged
// to the dead instance. We track the owning chart and drop refs when
// it changes; calls to removeSeries are wrapped in try/catch since
// lightweight-charts also throws when the series was already disposed
// internally (e.g. by chart.remove() in the parent hook).
export function useTrendOverlay(
  chartRef: React.MutableRefObject<IChartApi | null>,
  candles: Candle[],
  trendEma: (number | null)[],
  trendLowerBand: (number | null)[]
) {
  const ownerChartRef = useRef<IChartApi | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bandSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    if (ownerChartRef.current !== chart) {
      // Chart was recreated since the last run — refs point at dead
      // series. Drop them; lightweight-charts already disposed them
      // along with the old chart instance.
      emaSeriesRef.current = null;
      bandSeriesRef.current = null;
      ownerChartRef.current = chart;
    }

    const emaPoints: LineData<UTCTimestamp>[] = [];
    const bandPoints: LineData<UTCTimestamp>[] = [];
    for (let index = 0; index < candles.length; index++) {
      const ema = trendEma[index];
      const band = trendLowerBand[index];
      if (ema !== null && ema !== undefined) {
        emaPoints.push({ time: toUTCTimestamp(candles[index].time), value: ema });
      }
      if (band !== null && band !== undefined) {
        bandPoints.push({ time: toUTCTimestamp(candles[index].time), value: band });
      }
    }

    if (emaPoints.length === 0) {
      if (emaSeriesRef.current) {
        try {
          chart.removeSeries(emaSeriesRef.current);
        } catch {
          // already disposed
        }
        emaSeriesRef.current = null;
      }
      if (bandSeriesRef.current) {
        try {
          chart.removeSeries(bandSeriesRef.current);
        } catch {
          // already disposed
        }
        bandSeriesRef.current = null;
      }
      return;
    }

    if (!emaSeriesRef.current) {
      emaSeriesRef.current = chart.addLineSeries({
        color: EMA_COLOR,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }
    if (!bandSeriesRef.current) {
      bandSeriesRef.current = chart.addLineSeries({
        color: BAND_COLOR,
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }
    emaSeriesRef.current.setData(emaPoints);
    bandSeriesRef.current.setData(bandPoints);
  }, [chartRef, candles, trendEma, trendLowerBand]);
}
