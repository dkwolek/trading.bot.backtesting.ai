import { useMemo, useState } from 'react';
import { BookSnapshot } from '../../../services/kraken-ws';

const LEVELS = 6;
const GROUP_STEPS = [10, 20, 30];

interface GroupedLevel {
  price: number;
  qty: number;
}

/**
 * Creates fixed price buckets around the current price and sums qty into each.
 * Bids: buckets below price, descending. Asks: buckets above price, ascending.
 * Always returns exactly `count` levels so rows never appear/disappear.
 */
function buildFixedBuckets(
  levels: { price: number; qty: number }[],
  price: number,
  groupSize: number,
  side: 'bid' | 'ask',
  count: number
): GroupedLevel[] {
  const anchor =
    side === 'bid'
      ? Math.floor(price / groupSize) * groupSize
      : Math.ceil(price / groupSize) * groupSize;

  const buckets: GroupedLevel[] = [];
  for (let index = 0; index < count; index++) {
    const bucketPrice = side === 'bid' ? anchor - index * groupSize : anchor + index * groupSize;
    buckets.push({ price: bucketPrice, qty: 0 });
  }

  for (const level of levels) {
    const bucket =
      side === 'bid'
        ? Math.floor(level.price / groupSize) * groupSize
        : Math.ceil(level.price / groupSize) * groupSize;
    const match = buckets.find((entry) => entry.price === bucket);
    if (match) {
      match.qty += level.qty;
    }
  }

  return buckets;
}

interface Props {
  book: BookSnapshot;
  price: number;
}

export default function OrderBookPanel({ book, price }: Props) {
  const [groupIdx, setGroupIdx] = useState(0);
  const groupSize = GROUP_STEPS[groupIdx];

  const topBids = useMemo(
    () => buildFixedBuckets(book.bids, price, groupSize, 'bid', LEVELS),
    [book, price, groupSize]
  );
  const topAsks = useMemo(
    () => buildFixedBuckets(book.asks, price, groupSize, 'ask', LEVELS),
    [book, price, groupSize]
  );

  const bidTotal = book.bids.reduce((sum, level) => sum + level.qty, 0);
  const askTotal = book.asks.reduce((sum, level) => sum + level.qty, 0);
  const total = bidTotal + askTotal;
  const bidPct = total > 0 ? (bidTotal / total) * 100 : 50;

  const cumBids = useMemo(() => {
    let sum = 0;
    return topBids.map((level) => {
      sum += level.qty;
      return sum;
    });
  }, [topBids]);

  const cumAsks = useMemo(() => {
    let sum = 0;
    return topAsks.map((level) => {
      sum += level.qty;
      return sum;
    });
  }, [topAsks]);

  const maxCum = useMemo(() => {
    const maxBid = cumBids.length > 0 ? cumBids[cumBids.length - 1] : 0;
    const maxAsk = cumAsks.length > 0 ? cumAsks[cumAsks.length - 1] : 0;
    return Math.max(maxBid, maxAsk, 0.01);
  }, [cumBids, cumAsks]);

  const spread =
    book.bids.length > 0 && book.asks.length > 0
      ? (book.asks[0].price - book.bids[0].price).toFixed(2)
      : null;

  return (
    <div className="flex flex-col gap-1.5 border border-border rounded-sm bg-surface p-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
          Order Book
        </span>
        <div className="flex items-center border border-border rounded-sm overflow-hidden">
          <button
            onClick={() => setGroupIdx((prev) => Math.max(0, prev - 1))}
            className="px-1.5 py-0.5 text-[9px] text-muted hover:text-text hover:bg-bg transition-colors"
          >
            −
          </button>
          <span className="px-2 py-0.5 text-[9px] font-mono text-text bg-bg border-x border-border">
            {groupSize}
          </span>
          <button
            onClick={() => setGroupIdx((prev) => Math.min(GROUP_STEPS.length - 1, prev + 1))}
            className="px-1.5 py-0.5 text-[9px] text-muted hover:text-text hover:bg-bg transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex text-[7px] font-semibold tracking-wider uppercase text-muted">
        <span className="flex-1 text-left pl-1">Qty</span>
        <span className="flex-1 text-right pr-1">Bid</span>
        <span className="flex-1 text-left pl-1">Ask</span>
        <span className="flex-1 text-right pr-1">Qty</span>
      </div>

      {/* Order book rows */}
      <div className="flex flex-col gap-px">
        {Array.from({ length: LEVELS }).map((_, index) => {
          const bid = topBids[index];
          const ask = topAsks[index];
          const bidDepth = cumBids[index] ? (cumBids[index] / maxCum) * 100 : 0;
          const askDepth = cumAsks[index] ? (cumAsks[index] / maxCum) * 100 : 0;

          return (
            <div key={index} className="flex h-6">
              {/* Bid side */}
              <div className="flex-1 relative flex items-center overflow-hidden rounded-l-sm">
                <div
                  className="absolute inset-y-0 right-0 bg-green/15 transition-[width] duration-500"
                  style={{ width: `${bidDepth}%` }}
                />
                <span className="relative flex-1 text-[9px] font-mono text-muted/70 text-left pl-1 truncate">
                  {bid && bid.qty > 0 ? bid.qty.toFixed(2) : ''}
                </span>
                <span className="relative text-[9px] font-mono text-green font-medium pr-1 text-right whitespace-nowrap">
                  {bid ? bid.price.toFixed(0) : ''}
                </span>
              </div>

              {/* Ask side */}
              <div className="flex-1 relative flex items-center overflow-hidden rounded-r-sm">
                <div
                  className="absolute inset-y-0 left-0 bg-red/15 transition-[width] duration-500"
                  style={{ width: `${askDepth}%` }}
                />
                <span className="relative text-[9px] font-mono text-red font-medium pl-1 text-left whitespace-nowrap">
                  {ask ? ask.price.toFixed(0) : ''}
                </span>
                <span className="relative flex-1 text-[9px] font-mono text-muted/70 text-right pr-1 truncate">
                  {ask && ask.qty > 0 ? ask.qty.toFixed(2) : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Spread + Price */}
      <div className="flex items-center justify-center gap-2 py-1 border-t border-border">
        <span className="text-[10px] font-mono font-bold text-text">
          {price > 0 ? price.toFixed(2) : '—'}
        </span>
        {spread && <span className="text-[8px] font-mono text-muted">spread {spread}</span>}
      </div>

      {/* Pressure bar */}
      <div className="relative h-5 flex rounded-sm overflow-hidden bg-bg">
        <div
          className="bg-green/25 transition-all duration-500 flex items-center justify-end pr-1"
          style={{ width: `${bidPct}%` }}
        >
          <span className="text-[8px] font-mono font-bold text-green">{bidTotal.toFixed(1)}</span>
        </div>
        <div
          className="bg-red/25 transition-all duration-500 flex items-center pl-1"
          style={{ width: `${100 - bidPct}%` }}
        >
          <span className="text-[8px] font-mono font-bold text-red">{askTotal.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
