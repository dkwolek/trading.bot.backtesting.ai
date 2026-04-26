import { IChartApi, ISeriesApi, MouseEventParams } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

// Renders a small price tag at the right edge of the chart that follows
// the crosshair Y position. Built outside of lightweight-charts'
// built-in horzLine label so it's not affected by chart.localization.
// priceFormatter (which we override to hide non-step axis labels).
export function useCrosshairLabel(
  chartRef: React.MutableRefObject<IChartApi | null>,
  seriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
) {
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const label = labelRef.current;
    if (!chart || !series || !label) {
      return;
    }

    function handle(param: MouseEventParams) {
      if (!param.point || !label || !series) {
        if (label) {
          label.style.opacity = '0';
        }
        return;
      }
      const price = series.coordinateToPrice(param.point.y);
      if (price === null) {
        label.style.opacity = '0';
        return;
      }
      label.style.opacity = '1';
      label.style.top = `${param.point.y - 7}px`;
      label.textContent = price.toFixed(2);
    }

    chart.subscribeCrosshairMove(handle);
    return () => chart.unsubscribeCrosshairMove(handle);
  }, [chartRef, seriesRef]);

  return labelRef;
}
