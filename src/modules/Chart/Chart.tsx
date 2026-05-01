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
  resolveAmountPerLevel,
  resolveAtrMultiplier,
  resolveAtrPeriod,
  resolveChaseAfterTp,
  resolveCompounding,
  resolveStepPrice,
  resolveTrendEmaPeriod,
  resolveTrendFilter,
  resolveTrendRangeBandPct,
  resolveVolAdaptiveStep,
  simulateAutoGrid,
} from '../../algos/auto-grid.algo';
import { useTrendOverlay } from './hooks/useTrendOverlay';
import LevelOccupancyOverlay from './LevelOccupancyOverlay/LevelOccupancyOverlay';
import t from '../../locales';

interface Props {
  pair: string;
  candles: Candle[];
  trades?: Trade[];
}

export default function Chart({ pair, candles, trades }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { chartPaneRef, chartRef, seriesRef, candleSeriesRef } = useChartInit();

  const { selectedAlgo, algoOptions } = useTradingContext();
  const isAutoGrid = selectedAlgo.id === AlgoId.AutoGrid;

  const { compoundEvents, trendEma, trendLowerBand, effectiveStepPrice } = useMemo(() => {
    if (!isAutoGrid || candles.length === 0) {
      return { compoundEvents: [], trendEma: [], trendLowerBand: [], effectiveStepPrice: null };
    }
    const sim = simulateAutoGrid(candles, {
      stepPrice: resolveStepPrice(algoOptions),
      amountPerLevel: resolveAmountPerLevel(algoOptions),
      compounding: resolveCompounding(algoOptions),
      trendFilter: resolveTrendFilter(algoOptions),
      trendEmaPeriod: resolveTrendEmaPeriod(algoOptions),
      trendRangeBandPct: resolveTrendRangeBandPct(algoOptions),
      volAdaptiveStep: resolveVolAdaptiveStep(algoOptions),
      atrPeriod: resolveAtrPeriod(algoOptions),
      atrMultiplier: resolveAtrMultiplier(algoOptions),
      chaseAfterTp: resolveChaseAfterTp(algoOptions),
    });
    return {
      compoundEvents: sim.compoundEvents,
      trendEma: sim.trendEma,
      trendLowerBand: sim.trendLowerBand,
      effectiveStepPrice: sim.effectiveStepPrice,
    };
  }, [isAutoGrid, candles, algoOptions]);

  const autoGridStep = effectiveStepPrice;

  const levelStats = useMemo(() => {
    if (!isAutoGrid || candles.length === 0 || effectiveStepPrice === null) {
      return [];
    }
    return computeLevelOccupancy(candles, effectiveStepPrice);
  }, [isAutoGrid, candles, effectiveStepPrice]);

  useChartData(chartRef, seriesRef, candleSeriesRef, candles);
  useMartingaleOverlay(chartRef, seriesRef, candles, autoGridStep, trades);
  useTrendOverlay(chartRef, candles, trendEma, trendLowerBand);
  const crosshairLabelRef = useCrosshairLabel(chartRef, seriesRef);

  return (
    <div className="flex flex-col gap-2">
      <div ref={wrapperRef} className="relative border border-border bg-surface">
        <div
          ref={headerRef}
          className="px-2 py-1 border-b border-border font-mono text-[12px] font-medium text-text flex justify-between items-center"
        >
          <span>{pair}</span>
          <ClearCacheButton />
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
            compoundEvents={compoundEvents}
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
