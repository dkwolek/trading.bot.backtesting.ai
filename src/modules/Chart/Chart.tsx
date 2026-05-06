import { useMemo, useRef } from 'react';
import { Trade } from '../../types/algo.types';
import { Candle } from '../../types/global.types';
import { useChartInit } from './hooks/useChartInit';
import { useChartData } from './hooks/useChartData';
import { useCrosshairLabel } from './hooks/useCrosshairLabel';
import { useMartingaleOverlay } from './hooks/useMartingaleOverlay';
import MarkerCanvas from './MarkerCanvas/MarkerCanvas';
import ClearCacheButton from '../../components/Sidebar/ClearCacheButton/ClearCacheButton';
import { AlgoId } from '../../constants/algo.constants';
import { useTradingContext } from '../../context/TradingContext';
import {
  computeLevelOccupancy,
  resolveMonthlyAmount,
  resolveMonthlyMode,
  resolveStepPrice,
} from '../../algos/auto-grid.algo';
import { simulateDCA } from '../../algos/dca.algo';
import LevelOccupancyOverlay from './LevelOccupancyOverlay/LevelOccupancyOverlay';

interface Props {
  pair: string;
  candles: Candle[];
  trades?: Trade[];
}

export default function Chart({ pair, candles, trades }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { chartPaneRef, chartRef, seriesRef, candleSeriesRef } = useChartInit();

  const { selectedAlgo, algoOptions, initialAmount } = useTradingContext();
  const isAutoGrid = selectedAlgo.id === AlgoId.AutoGrid;
  const stepPrice = resolveStepPrice(algoOptions);
  const monthlyMode = resolveMonthlyMode(algoOptions);
  const monthlyAmount = resolveMonthlyAmount(algoOptions);
  const autoGridStep = isAutoGrid ? stepPrice : null;

  const levelStats = useMemo(() => {
    if (!isAutoGrid || candles.length === 0) {
      return [];
    }
    return computeLevelOccupancy(candles, stepPrice);
  }, [isAutoGrid, candles, stepPrice]);

  const dcaMarkers = useMemo(() => {
    if (!isAutoGrid || candles.length === 0) {
      return [];
    }
    const dca = simulateDCA(candles, initialAmount, monthlyMode ? monthlyAmount : 0);
    return dca.events.map((event) => ({ time: event.time, price: event.price }));
  }, [isAutoGrid, candles, initialAmount, monthlyMode, monthlyAmount]);

  useChartData(chartRef, seriesRef, candleSeriesRef, candles);
  useMartingaleOverlay(chartRef, seriesRef, candles, autoGridStep, trades);
  const crosshairLabelRef = useCrosshairLabel(chartRef, seriesRef);

  // Drive zoom via barSpacing (px / bar) instead of setVisibleLogicalRange.
  // lightweight-charts caps the visible logical range at ~1 bar minimum,
  // so even with an aggressive shrink factor the zoom hits an invisible
  // wall when each click should still be bringing more pixels per bar.
  // factor < 1 = zoom in (more px / bar), factor > 1 = zoom out.
  // Bounds: min 0.1 px / bar (very zoomed out), max 200 px / bar
  // (each candle takes a chunk of screen — beyond this it's a wall too).
  const MIN_BAR_SPACING = 0.1;
  const MAX_BAR_SPACING = 200;
  function zoomBy(factor: number) {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }
    const timeScale = chart.timeScale();
    const currentSpacing = timeScale.options().barSpacing ?? 6;
    const desired = currentSpacing / factor;
    const clamped = Math.min(MAX_BAR_SPACING, Math.max(MIN_BAR_SPACING, desired));
    timeScale.applyOptions({ barSpacing: clamped });
  }

  function resetZoom() {
    chartRef.current?.timeScale().fitContent();
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={wrapperRef} className="relative border border-border bg-surface">
        <div
          ref={headerRef}
          className="px-2 py-1 border-b border-border font-mono text-[12px] font-medium text-text flex justify-between items-center"
        >
          <span>{pair}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => zoomBy(0.5)}
              className="px-2 py-0.5 border border-border bg-bg text-muted hover:text-text hover:border-accent text-[11px] font-mono"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => zoomBy(2)}
              className="px-2 py-0.5 border border-border bg-bg text-muted hover:text-text hover:border-accent text-[11px] font-mono"
              title="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="px-2 py-0.5 border border-border bg-bg text-muted hover:text-text hover:border-accent text-[10px] font-mono uppercase tracking-wider"
              title="Reset zoom"
            >
              fit
            </button>
            <ClearCacheButton />
          </div>
        </div>
        <div className="relative overflow-hidden">
          <div ref={chartPaneRef} className="w-full" />
          <LevelOccupancyOverlay
            chartRef={chartRef}
            seriesRef={seriesRef}
            stats={levelStats}
            height={350}
          />
          <MarkerCanvas
            chartRef={chartRef}
            seriesRef={seriesRef}
            candles={candles}
            trades={trades}
            dcaMarkers={dcaMarkers}
          />
          <div
            ref={crosshairLabelRef}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              padding: '1px 4px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#e2e8f0',
              backgroundColor: '#22222e',
              pointerEvents: 'none',
              opacity: 0,
              zIndex: 6,
              transform: 'translateX(-2px)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
