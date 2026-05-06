import { ColorType, CrosshairMode, createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { formatCetTickMark, formatCetTime } from '../../../utils/chart-time';

interface ChartRefs {
  chartPaneRef: React.RefObject<HTMLDivElement>;
  chartRef: React.MutableRefObject<IChartApi | null>;
  seriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>;
  candleSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
}

export function useChartInit(): ChartRefs {
  const chartPaneRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartPaneRef.current) {
      return;
    }

    const chart = createChart(chartPaneRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#16161d' },
        textColor: '#e2e8f0',
      },
      grid: {
        // Default chart grid hidden in both axes — useMartingaleOverlay
        // paints dotted horizontal lines at every stepPrice, and
        // anything else just adds visual noise.
        vertLines: { visible: false, color: '#22222e' },
        horzLines: { visible: false, color: '#22222e' },
      },
      rightPriceScale: { borderColor: '#22222e' },
      // Custom price formatter keeps raw precision on the crosshair
      // tooltip — without it, priceFormat.minMove on the series would
      // round all displays (including crosshair) to the grid step.
      localization: {
        timeFormatter: formatCetTime,
        priceFormatter: (price: number) => price.toFixed(2),
      },
      timeScale: {
        borderColor: '#22222e',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        tickMarkFormatter: formatCetTickMark,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { labelVisible: true, labelBackgroundColor: '#22222e' },
        // Default horzLine label is hidden — the priceFormatter
        // suppresses non-step prices so the cursor's exact value would
        // come back blank. A custom DOM label (see useCrosshairLabel)
        // renders the raw price independently of priceFormatter.
        horzLine: { labelVisible: false, labelBackgroundColor: '#22222e' },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
        mouseWheel: true,
        pinch: true,
      },
      height: 350,
    });

    // Candle series first (drawn underneath) at 30 % opacity so the
    // line series stays the visual focus while high/low intra-bar
    // movement remains visible — markers fire on low/high so this lets
    // the user see why a buy/TP triggered when close-only line wouldn't
    // show it.
    const candleSeries = chart.addCandlestickSeries({
      upColor: 'rgba(0, 212, 170, 0.3)',
      downColor: 'rgba(255, 71, 87, 0.3)',
      borderUpColor: 'rgba(0, 212, 170, 0.3)',
      borderDownColor: 'rgba(255, 71, 87, 0.3)',
      wickUpColor: 'rgba(0, 212, 170, 0.3)',
      wickDownColor: 'rgba(255, 71, 87, 0.3)',
      priceScaleId: 'right',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const series = chart.addLineSeries({
      color: '#e2e8f0',
      lineWidth: 1,
      priceScaleId: 'right',
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
    });

    chart.priceScale('right').applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.05 },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    candleSeriesRef.current = candleSeries;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    observer.observe(chartPaneRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, []);

  return { chartPaneRef, chartRef, seriesRef, candleSeriesRef };
}
