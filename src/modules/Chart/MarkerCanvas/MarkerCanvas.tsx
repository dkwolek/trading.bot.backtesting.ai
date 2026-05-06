import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { Trade } from '../../../types/algo.types';
import { Candle } from '../../../types/global.types';
import { toUTCTimestamp } from '../chart.utils';

interface DcaMarker {
  time: number;
  price: number;
}

interface Props {
  chartRef: React.MutableRefObject<IChartApi | null>;
  seriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>;
  candles: Candle[];
  trades?: Trade[];
  dcaMarkers?: DcaMarker[];
}

const BUY_COLOR = '#00d4aa';
const SELL_COLOR = '#ff4757';
const DCA_COLOR = '#3b82f6';
const ARROW_SIZE = 6;
const DCA_DOT_RADIUS = 2;
const DCA_MIN_SPACING_PX = 14;
const LABEL_GAP = 2;
const FONT = '9px monospace';
const MAX_MARKERS = 200;
const MIN_SPACING_PX = 24;

interface MarkerSpec {
  side: 'Buy' | 'Sell';
  time: number;
  price: number;
  label: string;
}

function buildMarkerSpecs(trades: Trade[]): MarkerSpec[] {
  // Emit every cycle's marker — the spatial decimation in the draw
  // loop collapses overlapping ones based on the current zoom, so the
  // user sees more markers when they zoom in but not a wall of
  // identical labels when zoomed out. Sort by time at the end so the
  // draw loop can binary-search the visible window instead of scanning
  // all specs every frame (matters on dense 1m × 12M datasets where
  // specs.length pushes 100k+).
  const specs: MarkerSpec[] = [];
  for (const trade of trades) {
    for (const level of trade.levels) {
      specs.push({
        side: 'Buy',
        time: level.time,
        price: level.price,
        label: `L${Math.round(level.price)}`,
      });
    }
    if (trade.exitLabel === 'OPEN') {
      continue;
    }
    specs.push({
      side: 'Sell',
      time: trade.exitTime,
      price: trade.exitPrice,
      label: `TP${Math.round(trade.entryPrice)}`,
    });
  }
  specs.sort((first, second) => first.time - second.time);
  return specs;
}

// Returns the smallest index i such that specs[i].time >= time. Spec
// array is sorted by time so we can clip the per-frame iteration to
// just the visible window instead of scanning every entry.
function lowerBoundByTime(specs: MarkerSpec[], time: number): number {
  let low = 0;
  let high = specs.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (specs[mid].time < time) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  side: 'Buy' | 'Sell',
  color: string
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (side === 'Buy') {
    // Tip at (x, y), body extending downward — visually rising into the
    // limit fill from below.
    ctx.moveTo(x, y);
    ctx.lineTo(x - ARROW_SIZE / 2, y + ARROW_SIZE);
    ctx.lineTo(x + ARROW_SIZE / 2, y + ARROW_SIZE);
  } else {
    // Tip at (x, y), body extending upward — pointing down into the TP.
    ctx.moveTo(x, y);
    ctx.lineTo(x - ARROW_SIZE / 2, y - ARROW_SIZE);
    ctx.lineTo(x + ARROW_SIZE / 2, y - ARROW_SIZE);
  }
  ctx.closePath();
  ctx.fill();
}

// Single canvas overlay drawn imperatively: each frame the canvas is
// cleared and the marker arrows + labels are redrawn at the live
// (time, price) → (x, y) projection. No DOM nodes per marker so React
// reconciliation can't leak ghost elements during zoom/pan, and
// positions land exactly on the level price (unlike setMarkers which
// anchors above/below the line value).
export default function MarkerCanvas({ chartRef, seriesRef, candles, trades, dcaMarkers }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const specs = trades ? buildMarkerSpecs(trades) : [];

    // Index candles by time so we can find the previous close when a
    // marker fires — used to interpolate the X position where the line
    // (close-to-close) actually crosses the level price.
    const candleIndexByTime = new Map<number, number>();
    for (let index = 0; index < candles.length; index++) {
      candleIndexByTime.set(candles[index].time, index);
    }

    function draw() {
      const chart = chartRef.current;
      const series = seriesRef.current;
      if (!chart || !series || !canvas || !ctx) {
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const targetW = rect.width;
      const targetH = rect.height;
      if (canvas.width !== targetW * dpr || canvas.height !== targetH * dpr) {
        canvas.width = Math.floor(targetW * dpr);
        canvas.height = Math.floor(targetH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.clearRect(0, 0, targetW, targetH);

      const visibleRange = chart.timeScale().getVisibleRange();
      const fromTime = visibleRange ? Number(visibleRange.from) : Number.NEGATIVE_INFINITY;
      const toTime = visibleRange ? Number(visibleRange.to) : Number.POSITIVE_INFINITY;

      ctx.font = FONT;
      ctx.textAlign = 'center';

      // DCA baseline dots: one tiny blue circle per actual DCA buy
      // event (passed in from the simulation, not derived from
      // candles). Per-candle dense dots are decimated by
      // `DCA_MIN_SPACING_PX` so a 1m × 12M dataset doesn't paint
      // 500k overlapping points; sparse monthly events draw 1:1.
      if (dcaMarkers && dcaMarkers.length > 0) {
        ctx.fillStyle = DCA_COLOR;
        let lastDcaX = Number.NEGATIVE_INFINITY;
        for (const marker of dcaMarkers) {
          if (marker.time < fromTime || marker.time > toTime) {
            continue;
          }
          const dcaX = chart.timeScale().timeToCoordinate(toUTCTimestamp(marker.time));
          const dcaY = series.priceToCoordinate(marker.price);
          if (dcaX === null || dcaY === null) {
            continue;
          }
          if (dcaX - lastDcaX < DCA_MIN_SPACING_PX) {
            continue;
          }
          lastDcaX = dcaX;
          ctx.beginPath();
          ctx.arc(dcaX, dcaY, DCA_DOT_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (specs.length === 0) {
        return;
      }

      const placed: { side: 'Buy' | 'Sell'; xBucket: number; yBucket: number }[] = [];
      let drawn = 0;

      // Clip iteration to the visible window via binary search — on
      // 1m × 12M datasets specs.length easily exceeds 100k and a
      // linear scan per frame eats noticeable CPU even though the
      // visibility check rejects every off-screen entry.
      const startIndex = Number.isFinite(fromTime) ? lowerBoundByTime(specs, fromTime) : 0;
      for (let specIndex = startIndex; specIndex < specs.length; specIndex++) {
        const spec = specs[specIndex];
        if (drawn >= MAX_MARKERS) {
          break;
        }
        if (spec.time > toTime) {
          break;
        }
        const baseX = chart.timeScale().timeToCoordinate(toUTCTimestamp(spec.time));
        const y = series.priceToCoordinate(spec.price);
        if (baseX === null || y === null) {
          continue;
        }

        // Interpolate the X where the close-to-close line actually
        // crosses spec.price between the prior candle and this one.
        // Without this the marker sits at the firing candle's data
        // point even though the line crossed the level somewhere on the
        // way down/up to that point.
        let x: number = baseX;
        const candleIndex = candleIndexByTime.get(spec.time);
        if (candleIndex !== undefined && candleIndex > 0) {
          const prevCandle = candles[candleIndex - 1];
          const currCandle = candles[candleIndex];
          // Buy interpolates on a down-cross (filling on a dip) AND on
          // an up-cross — chase entries open simultaneously with their
          // TP at the same price/time and need to land at the same x
          // as the TP marker. Without the up-cross branch they snapped
          // to raw candle time while the TP slid left to the actual
          // line crossing, drifting them apart visually.
          const crossesDown =
            (spec.side === 'Buy' || spec.side === 'Sell') &&
            prevCandle.close > spec.price &&
            currCandle.close <= spec.price;
          const crossesUp =
            (spec.side === 'Buy' || spec.side === 'Sell') &&
            prevCandle.close < spec.price &&
            currCandle.close >= spec.price;
          if (crossesDown || crossesUp) {
            const prevX = chart.timeScale().timeToCoordinate(toUTCTimestamp(prevCandle.time));
            if (prevX !== null) {
              const ratio = (spec.price - prevCandle.close) / (currCandle.close - prevCandle.close);
              const clamped = Math.max(0, Math.min(1, ratio));
              x = prevX + clamped * (baseX - prevX);
            }
          }
        }

        const xBucket = Math.floor(x / MIN_SPACING_PX);
        const yBucket = Math.floor(y / MIN_SPACING_PX);
        if (
          placed.some(
            (entry) =>
              entry.side === spec.side && entry.xBucket === xBucket && entry.yBucket === yBucket
          )
        ) {
          continue;
        }
        placed.push({ side: spec.side, xBucket, yBucket });

        const color = spec.side === 'Buy' ? BUY_COLOR : SELL_COLOR;

        drawArrow(ctx, x, y, spec.side, color);

        ctx.fillStyle = color;
        const labelY =
          spec.side === 'Buy' ? y + ARROW_SIZE + LABEL_GAP + 8 : y - ARROW_SIZE - LABEL_GAP - 2;
        ctx.fillText(spec.label, x, labelY);

        drawn++;
      }
    }

    draw();
    let rafId: number | null = null;
    let stopped = false;
    function tick() {
      if (stopped) {
        return;
      }
      draw();
      rafId = requestAnimationFrame(tick);
    }
    tick();

    function handleResize() {
      draw();
    }
    window.addEventListener('resize', handleResize);

    return () => {
      stopped = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [chartRef, seriesRef, trades, dcaMarkers]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
