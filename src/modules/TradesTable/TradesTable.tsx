import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import { useTradeHighlight } from '../../context/TradeHighlightContext';
import { Trade } from '../../types/algo.types';
import t from '../../locales';
import { AlgoId } from '../../constants/algo.constants';
import { resolveAmountPerLevel } from '../../algos/auto-grid.algo';
import TradeDetailModal, { TradeDetail } from '../TradeDetailModal/TradeDetailModal';
import TradeCard from './TradeCard/TradeCard';
import LevelGroupRow from './LevelGroupRow/LevelGroupRow';
import { buildRows, buildDetail, groupRowsByLevel } from './tradesTable.utils';

interface Props {
  trades?: Trade[];
}

export interface TradesTableHandle {
  openDetail: (entryTime: number) => void;
}

const TradesTable = forwardRef<TradesTableHandle, Props>(function TradesTable({ trades }, ref) {
  const { initialAmount, algoOptions, selectedAlgo } = useTradingContext();
  const { hoveredEntryTime } = useTradeHighlight();
  const isAutoGrid = selectedAlgo.id === AlgoId.AutoGrid;
  // Each trade is one fixed-size buy worth `autoGridAmountPerLevel`.
  // Mirrors the same calc in services/backtesting.ts so per-trade
  // dollar PnL in the trade list lines up with the metrics panel.
  const totalSlots = (() => {
    const amount = algoOptions.autoGridAmountPerLevel;
    if (typeof amount === 'number' && amount > 0 && initialAmount > 0) {
      return Math.max(1, initialAmount / amount);
    }
    return 3;
  })();
  // Required capital = distinct entry levels actually visited × amount.
  // Trend filter and other gating naturally shrink this — we count
  // unique entry prices straight from the trade list rather than
  // re-simulating, since trades already reflect the bot's behavior.
  const requiredCapital = (() => {
    if (!isAutoGrid || !trades || trades.length === 0) {
      return 0;
    }
    const amount = resolveAmountPerLevel(algoOptions);
    const uniqueLevels = new Set(trades.map((trade) => trade.entryPrice));
    return uniqueLevels.size * amount;
  })();
  const rows = trades ? buildRows(trades, initialAmount, totalSlots).reverse() : [];
  const openRows = rows.filter((row) => row.trade.exitLabel === 'OPEN');
  const closedRows = rows.filter((row) => row.trade.exitLabel !== 'OPEN');
  const groups = groupRowsByLevel(closedRows);
  const openGroup =
    openRows.length > 0
      ? {
          level: 0,
          rows: openRows,
          totalDollarPnl: openRows.reduce((sum, row) => sum + row.dollarPnl, 0),
          closedCount: 0,
          openCount: openRows.length,
          latestExitTime: 0,
        }
      : null;
  const closedTotal =
    closedRows.length > 0
      ? {
          count: closedRows.length,
          dollarPnl: closedRows.reduce((sum, row) => sum + row.dollarPnl, 0),
        }
      : null;
  const [selectedDetail, setSelectedDetail] = useState<TradeDetail | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());
  const highlightedRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  function toggleLevel(level: number) {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }

  useEffect(() => {
    setExpandedLevels(new Set());
  }, [trades]);

  useEffect(() => {
    if (hoveredEntryTime !== null && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [hoveredEntryTime]);

  useImperativeHandle(ref, () => ({
    openDetail(entryTime: number) {
      const row = rows.find((row) => row.trade.entryTime === entryTime);
      if (row) {
        // Expand the level group containing this trade so the highlight
        // doesn't get hidden behind a collapsed header.
        setExpandedLevels((prev) => {
          const next = new Set(prev);
          next.add(Math.round(row.trade.entryPrice));
          return next;
        });
        setSelectedDetail(buildDetail(row));
      }
    },
  }));

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
        {t.trades.title} {rows.length > 0 && `(${rows.length})`}
      </span>
      {!trades ? (
        <div className="border border-border bg-surface flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="border border-border bg-surface flex-1 min-h-0 flex flex-col">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={`px-3 py-2 border-b border-border ${index % 2 === 0 ? '' : 'bg-border/10'}`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <div className="h-2.5 w-16 bg-border rounded" />
                    <div className="h-2.5 w-16 bg-border rounded" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-14 bg-border rounded" />
                    <div className="h-3 w-14 bg-border rounded" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-2.5 w-12 bg-border rounded" />
                    <div className="h-2.5 w-10 bg-border rounded" />
                  </div>
                </div>
              </div>
            ))}
            <span className="text-muted text-[11px] text-center py-4">{t.trades.placeholder}</span>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="border border-border bg-surface flex-1 min-h-0 flex items-center justify-center">
          <p className="text-muted text-[11px]">{t.trades.noTrades}</p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="border border-border overflow-y-auto flex-1 min-h-0 flex flex-col"
        >
          {openGroup && (
            <div>
              <LevelGroupRow
                group={openGroup}
                expanded={expandedLevels.has(openGroup.level)}
                onToggle={() => toggleLevel(openGroup.level)}
                variant="open"
              />
              {expandedLevels.has(openGroup.level) &&
                openGroup.rows.map((row, index) => {
                  const isHighlighted = hoveredEntryTime === row.trade.entryTime;
                  return (
                    <div key={row.trade.entryTime} ref={isHighlighted ? highlightedRef : undefined}>
                      <TradeCard
                        row={row}
                        highlighted={isHighlighted}
                        striped={index % 2 === 0}
                        requiredCapital={requiredCapital}
                        onClick={() => setSelectedDetail(buildDetail(row))}
                      />
                    </div>
                  );
                })}
            </div>
          )}
          {closedTotal && (
            <div className="px-3 py-2 border-b border-border bg-surface flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-text">CLOSED ({closedTotal.count})</span>
              <span
                className={`font-mono text-[10px] ${closedTotal.dollarPnl >= 0 ? 'text-green' : 'text-red'}`}
              >
                {closedTotal.dollarPnl >= 0 ? '+' : '-'}$
                {Math.abs(closedTotal.dollarPnl).toFixed(2)}
              </span>
            </div>
          )}
          {groups.map((group) => {
            const expanded = expandedLevels.has(group.level);
            return (
              <div key={group.level}>
                <LevelGroupRow
                  group={group}
                  expanded={expanded}
                  onToggle={() => toggleLevel(group.level)}
                />
                {expanded &&
                  group.rows.map((row, index) => {
                    const isHighlighted = hoveredEntryTime === row.trade.entryTime;
                    return (
                      <div
                        key={row.trade.entryTime}
                        ref={isHighlighted ? highlightedRef : undefined}
                      >
                        <TradeCard
                          row={row}
                          highlighted={isHighlighted}
                          striped={index % 2 === 0}
                          requiredCapital={requiredCapital}
                          onClick={() => setSelectedDetail(buildDetail(row))}
                        />
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}
      {selectedDetail && (
        <TradeDetailModal detail={selectedDetail} onClose={() => setSelectedDetail(null)} />
      )}
    </div>
  );
});

export default TradesTable;
