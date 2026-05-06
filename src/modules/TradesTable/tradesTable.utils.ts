import { Trade } from '../../types/algo.types';
import { formatDuration, TradeDetail } from '../TradeDetailModal/TradeDetailModal';

export interface TradeRow {
  trade: Trade;
  tradeAmount: number;
  dollarPnl: number;
  balance: number;
}

export function buildRows(trades: Trade[], initialAmount: number, totalSlots: number): TradeRow[] {
  let balance = initialAmount;
  return trades.map((trade) => {
    // Prefer the actual cost the algo reports (auto-grid attaches it
    // per cycle so monthly mode's drifting amountPerLevel surfaces
    // correctly). Fall back to the legacy "balance × deployed
    // fraction" estimate for algos that don't carry cost.
    const tradeAmount =
      typeof trade.cost === 'number' ? trade.cost : balance * (trade.quantity / totalSlots);
    const dollarPnl = tradeAmount * (trade.pnlPercent / 100);
    balance += dollarPnl;
    return { trade, tradeAmount, dollarPnl, balance };
  });
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDollar(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPnlPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatBalance(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface LevelGroup {
  level: number;
  rows: TradeRow[];
  totalDollarPnl: number;
  closedCount: number;
  openCount: number;
  // For sticky ordering even when individual trades' chrono is reversed
  // — we display the most recently active level first.
  latestExitTime: number;
}

export function groupRowsByLevel(rows: TradeRow[]): LevelGroup[] {
  const map = new Map<number, LevelGroup>();
  for (const row of rows) {
    const level = Math.round(row.trade.entryPrice);
    let group = map.get(level);
    if (!group) {
      group = {
        level,
        rows: [],
        totalDollarPnl: 0,
        closedCount: 0,
        openCount: 0,
        latestExitTime: 0,
      };
      map.set(level, group);
    }
    group.rows.push(row);
    group.totalDollarPnl += row.dollarPnl;
    if (row.trade.exitLabel === 'OPEN') {
      group.openCount += 1;
    } else {
      group.closedCount += 1;
    }
    if (row.trade.exitTime > group.latestExitTime) {
      group.latestExitTime = row.trade.exitTime;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.latestExitTime - a.latestExitTime);
}

export function buildDetail(row: TradeRow): TradeDetail {
  return {
    entryTime: formatDate(row.trade.entryTime),
    exitTime: formatDate(row.trade.exitTime),
    entryPrice: formatPrice(row.trade.entryPrice),
    exitPrice: formatPrice(row.trade.exitPrice),
    tradeAmount: formatBalance(row.tradeAmount),
    dollarPnl: formatDollar(row.dollarPnl),
    pnlPercent: formatPnlPercent(row.trade.pnlPercent),
    balance: formatBalance(row.balance),
    quantity: row.trade.quantity,
    duration: formatDuration(row.trade.entryTime, row.trade.exitTime),
    isProfit: row.dollarPnl >= 0,
  };
}
